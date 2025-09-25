import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { coldOutreachRateLimit } from '@/lib/rate-limit';
import { getDb } from '@/utils/dbConfig';
import { Campaigns, Messages, Contacts } from '@/utils/schema';
import { eq, and, sql } from 'drizzle-orm';
import { z } from 'zod';
import { logger, withPerformanceMonitoring, ValidationError, retryWithBackoff, sanitizeInput } from '@/lib/client-utils';

/**
 * Zod validation schemas for automation operations
 */
const automationPostSchema = z.object({
  action: z.enum([
    'schedule_campaign',
    'start_follow_up_sequence',
    'pause_automation',
    'resume_automation'
  ]),
  campaignId: z.string().optional(),
  scheduleTime: z.string().optional(),
  followUpConfig: z.object({
    delays: z.array(z.number()).optional(),
    subjects: z.array(z.string()).optional(),
    contents: z.array(z.string()).optional(),
  }).optional(),
});

const automationGetSchema = z.object({
  action: z.enum([
    'get_automation_status',
    'get_scheduled_jobs',
    'get_execution_queue'
  ]),
  campaignId: z.string().optional(),
});

/**
 * Audit logging functions for automation operations
 */
async function auditAutomationOperation(
  operation: string,
  userId: string,
  metadata?: Record<string, any>
) {
  logger.info(`Automation ${operation}`, {
    userId,
    operation,
    resource: 'automation',
    ...metadata,
    timestamp: new Date().toISOString(),
    source: 'api:cold-outreach:automation'
  });
}

/**
 * POST /api/cold-outreach/automation
 * Handles various automation operations for cold outreach campaigns
 * @param request - Next.js request object containing action and parameters
 * @returns Promise<NextResponse> - JSON response with automation operation result
 */
export const POST = withPerformanceMonitoring(
  async (request: NextRequest): Promise<NextResponse> => {
    const startTime = Date.now();
    let userId: string | null = null;

    try {
      // Authentication
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        logger.warn('Unauthorized access attempt to automation API', {
          ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
          timestamp: new Date().toISOString(),
        });
        return NextResponse.json(
          { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
          { status: 401 }
        );
      }

      userId = session.user.id;

      // Rate limiting with detailed logging
      const rateLimitResult = coldOutreachRateLimit.check(session.user.id, request);
      if (!rateLimitResult.allowed) {
        logger.warn('Rate limit exceeded for automation operations', {
          userId: session.user.id,
          limit: 30,
          resetTime: rateLimitResult.resetTime,
          timestamp: new Date().toISOString(),
        });
        return NextResponse.json(
          {
            error: 'Rate limit exceeded. Please try again later.',
            code: 'RATE_LIMIT_EXCEEDED',
            retryAfter: rateLimitResult.retryAfter,
          },
          { status: 429 }
        );
      }

      // Parse and validate request body
      let body: any;
      try {
        body = await request.json();
      } catch (parseError) {
        logger.warn('Invalid JSON in automation request', {
          userId,
          error: parseError instanceof Error ? parseError.message : 'Invalid JSON',
          timestamp: new Date().toISOString(),
        });
        return NextResponse.json(
          { error: 'Invalid JSON payload', code: 'INVALID_JSON' },
          { status: 400 }
        );
      }

      // Validate input with Zod schema
      const validatedData = automationPostSchema.parse(body);
      const { action, campaignId, scheduleTime, followUpConfig } = validatedData;

      logger.info('Processing automation request', {
        userId,
        action,
        campaignId: campaignId ? '[REDACTED]' : undefined,
        hasScheduleTime: !!scheduleTime,
        hasFollowUpConfig: !!followUpConfig,
        timestamp: new Date().toISOString(),
      });

      const db = getDb();

      // Route to appropriate handler based on action
      let result: NextResponse;

      switch (action) {
        case 'schedule_campaign':
          if (!campaignId || !scheduleTime) {
            return NextResponse.json(
              { error: 'campaignId and scheduleTime are required for schedule_campaign', code: 'MISSING_PARAMETERS' },
              { status: 400 }
            );
          }
          result = await scheduleCampaign(db, userId, campaignId, scheduleTime);
          break;

        case 'start_follow_up_sequence':
          if (!campaignId || !followUpConfig) {
            return NextResponse.json(
              { error: 'campaignId and followUpConfig are required for start_follow_up_sequence', code: 'MISSING_PARAMETERS' },
              { status: 400 }
            );
          }
          result = await startFollowUpSequence(db, userId, campaignId, followUpConfig);
          break;

        case 'pause_automation':
          if (!campaignId) {
            return NextResponse.json(
              { error: 'campaignId is required for pause_automation', code: 'MISSING_PARAMETERS' },
              { status: 400 }
            );
          }
          result = await pauseAutomation(db, userId, campaignId);
          break;

        case 'resume_automation':
          if (!campaignId) {
            return NextResponse.json(
              { error: 'campaignId is required for resume_automation', code: 'MISSING_PARAMETERS' },
              { status: 400 }
            );
          }
          result = await resumeAutomation(db, userId, campaignId);
          break;

        default:
          return NextResponse.json(
            { error: 'Invalid action', code: 'INVALID_ACTION' },
            { status: 400 }
          );
      }

      const responseTime = Date.now() - startTime;

      logger.info('Automation request completed', {
        userId,
        action,
        responseTime,
        timestamp: new Date().toISOString(),
      });

      // Audit log the automation operation
      await auditAutomationOperation(action, userId, {
        action,
        campaignId: campaignId ? '[REDACTED]' : undefined,
        responseTime,
      });

      return result;

    } catch (error) {
      const responseTime = Date.now() - startTime;

      logger.error('Automation API error', error instanceof Error ? error : new Error('Unknown error'), {
        userId,
        responseTime,
        timestamp: new Date().toISOString(),
      });

      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            error: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: error.errors.map(err => ({
              field: err.path.join('.'),
              message: err.message,
              code: err.code,
            })),
          },
          { status: 400 }
        );
      }

      if (error instanceof ValidationError) {
        return NextResponse.json(
          {
            error: error.message,
            code: 'VALIDATION_ERROR',
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          error: 'Internal server error',
          code: 'INTERNAL_ERROR',
          metadata: {
            responseTime,
            timestamp: new Date().toISOString(),
          },
        },
        { status: 500 }
      );
    }
  },
  'automation.post'
);

/**
 * GET /api/cold-outreach/automation
 * Retrieves automation status and queue information
 * @param request - Next.js request object with query parameters
 * @returns Promise<NextResponse> - JSON response with automation data
 */
export const GET = withPerformanceMonitoring(
  async (request: NextRequest): Promise<NextResponse> => {
    const startTime = Date.now();
    let userId: string | null = null;

    try {
      // Authentication
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        logger.warn('Unauthorized access attempt to automation status API', {
          ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
          timestamp: new Date().toISOString(),
        });
        return NextResponse.json(
          { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
          { status: 401 }
        );
      }

      userId = session.user.id;

      // Rate limiting with detailed logging
      const rateLimitResult = coldOutreachRateLimit.check(session.user.id, request);
      if (!rateLimitResult.allowed) {
        logger.warn('Rate limit exceeded for automation status read', {
          userId: session.user.id,
          limit: 60,
          resetTime: rateLimitResult.resetTime,
          timestamp: new Date().toISOString(),
        });
        return NextResponse.json(
          {
            error: 'Rate limit exceeded. Please try again later.',
            code: 'RATE_LIMIT_EXCEEDED',
            retryAfter: rateLimitResult.retryAfter,
          },
          { status: 429 }
        );
      }

      // Parse and validate query parameters
      const { searchParams } = new URL(request.url);
      const queryValidation = automationGetSchema.safeParse({
        action: searchParams.get('action'),
        campaignId: searchParams.get('campaignId'),
      });

      if (!queryValidation.success) {
        return NextResponse.json(
          {
            error: 'Invalid query parameters',
            code: 'INVALID_QUERY_PARAMS',
            details: queryValidation.error.errors.map(err => ({
              field: err.path.join('.'),
              message: err.message,
              code: err.code,
            })),
          },
          { status: 400 }
        );
      }

      const { action, campaignId } = queryValidation.data;

      logger.info('Fetching automation status', {
        userId,
        action,
        campaignId: campaignId ? '[REDACTED]' : undefined,
        timestamp: new Date().toISOString(),
      });

      const db = getDb();

      // Route to appropriate handler based on action
      let result: NextResponse;

      switch (action) {
        case 'get_automation_status':
          result = await getAutomationStatus(db, userId, campaignId);
          break;

        case 'get_scheduled_jobs':
          result = await getScheduledJobs(db, userId);
          break;

        case 'get_execution_queue':
          if (!campaignId) {
            return NextResponse.json(
              { error: 'campaignId is required for get_execution_queue', code: 'MISSING_PARAMETERS' },
              { status: 400 }
            );
          }
          result = await getExecutionQueue(db, userId, campaignId);
          break;

        default:
          return NextResponse.json(
            { error: 'Invalid action', code: 'INVALID_ACTION' },
            { status: 400 }
          );
      }

      const responseTime = Date.now() - startTime;

      logger.info('Automation status request completed', {
        userId,
        action,
        responseTime,
        timestamp: new Date().toISOString(),
      });

      // Audit log the read operation
      await auditAutomationOperation(`read_${action}`, userId, {
        action,
        campaignId: campaignId ? '[REDACTED]' : undefined,
        responseTime,
      });

      return result;

    } catch (error) {
      const responseTime = Date.now() - startTime;

      logger.error('Automation GET API error', error instanceof Error ? error : new Error('Unknown error'), {
        userId,
        responseTime,
        timestamp: new Date().toISOString(),
      });

      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            error: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: error.errors.map(err => ({
              field: err.path.join('.'),
              message: err.message,
              code: err.code,
            })),
          },
          { status: 400 }
        );
      }

      if (error instanceof ValidationError) {
        return NextResponse.json(
          {
            error: error.message,
            code: 'VALIDATION_ERROR',
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          error: 'Internal server error',
          code: 'INTERNAL_ERROR',
          metadata: {
            responseTime,
            timestamp: new Date().toISOString(),
          },
        },
        { status: 500 }
      );
    }
  },
  'automation.get'
);

async function scheduleCampaign(
  db: any,
  userId: string,
  campaignId: string,
  scheduleTime: string
): Promise<NextResponse> {
  try {
    // Validate and sanitize inputs
    const sanitizedCampaignId = sanitizeInput(campaignId);
    const sanitizedScheduleTime = sanitizeInput(scheduleTime);

    if (!sanitizedCampaignId || !sanitizedScheduleTime) {
      return NextResponse.json(
        { error: 'Invalid campaign ID or schedule time', code: 'INVALID_INPUT' },
        { status: 400 }
      );
    }

    // Validate schedule time format
    const scheduleDate = new Date(sanitizedScheduleTime);
    if (isNaN(scheduleDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid schedule time format', code: 'INVALID_SCHEDULE_TIME' },
        { status: 400 }
      );
    }

    if (scheduleDate <= new Date()) {
      return NextResponse.json(
        { error: 'Schedule time must be in the future', code: 'PAST_SCHEDULE_TIME' },
        { status: 400 }
      );
    }

    logger.info('Scheduling campaign', {
      userId,
      campaignId: '[REDACTED]',
      scheduleTime: sanitizedScheduleTime,
      timestamp: new Date().toISOString(),
    });

    // Verify campaign ownership with retry
    const campaignResult = await retryWithBackoff(
      () => db.select().from(Campaigns).where(
        and(eq(Campaigns.id, sanitizedCampaignId), eq(Campaigns.userId, userId))
      ).limit(1),
      3,
      1000
    );
    const campaign = campaignResult as any[];

    if (!campaign || campaign.length === 0) {
      logger.warn('Campaign not found for scheduling', {
        userId,
        campaignId: '[REDACTED]',
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json(
        { error: 'Campaign not found', code: 'CAMPAIGN_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Update campaign with schedule using retry
    await retryWithBackoff(
      () => db.update(Campaigns)
        .set({
          status: 'scheduled',
          startDate: scheduleDate,
          updatedAt: new Date()
        })
        .where(and(eq(Campaigns.id, sanitizedCampaignId), eq(Campaigns.userId, userId))),
      3,
      1000
    );

    logger.info('Campaign scheduled successfully', {
      userId,
      campaignId: '[REDACTED]',
      scheduleTime: sanitizedScheduleTime,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: 'Campaign scheduled successfully',
      scheduledTime: sanitizedScheduleTime,
      metadata: {
        campaignId: '[REDACTED]',
        timestamp: new Date().toISOString(),
        apiVersion: 'v1',
      },
    });

  } catch (error) {
    logger.error('Error scheduling campaign', error instanceof Error ? error : new Error('Unknown error'), {
      userId,
      campaignId: '[REDACTED]',
      scheduleTime,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        error: 'Failed to schedule campaign',
        code: 'SCHEDULING_FAILED',
        metadata: {
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }
}

async function startFollowUpSequence(db: any, userId: string, campaignId: string, followUpConfig: any) {
  try {
    // Verify campaign ownership
    const campaign = await db.select().from(Campaigns).where(
      and(eq(Campaigns.id, campaignId), eq(Campaigns.userId, userId))
    ).limit(1);

    if (campaign.length === 0) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Create follow-up messages in queue
    // TODO: Implement pagination or limit contacts to avoid memory issues
    const contacts = await db.select().from(Contacts)
      .where(eq(Contacts.userId, userId))
      .limit(1000); // Add reasonable limit

    const followUpMessages = [];
    for (const contact of contacts) {
      if (followUpConfig.delays && followUpConfig.delays.length > 0) {
        for (let i = 0; i < followUpConfig.delays.length; i++) {
          const delay = followUpConfig.delays[i];
          const scheduledTime = new Date(Date.now() + delay * 24 * 60 * 60 * 1000); // Convert days to ms

          followUpMessages.push({
            campaignId,
            contactId: contact.id,
            subject: followUpConfig.subjects?.[i] || `Follow-up ${i + 1}`,
            content: followUpConfig.contents?.[i] || 'Follow-up message content',
            status: 'queued',
            scheduledAt: scheduledTime,
            createdAt: new Date(),
            updatedAt: new Date()
          });
        }
      }
    }

    // Insert follow-up messages
    if (followUpMessages.length > 0) {
      await db.insert(Messages).values(followUpMessages);
    }

    return NextResponse.json({
      success: true,
      message: `Created ${followUpMessages.length} follow-up messages`,
      followUpCount: followUpMessages.length
    });
  } catch (error) {
    logger.error(
      'Failed to start follow-up sequence',
      error instanceof Error ? error : new Error('Unknown error'),
      { userId, campaignId }
    );
    return NextResponse.json(
      { error: 'Failed to start follow-up sequence', code: 'FOLLOW_UP_FAILED' },
      { status: 500 }
    );
  }
}
async function pauseAutomation(db: any, userId: string, campaignId: string) {
  // Verify campaign ownership first
  const campaign = await db
    .select()
    .from(Campaigns)
    .where(
      and(
        eq(Campaigns.id, campaignId),
        eq(Campaigns.userId, userId)
      )
    )
    .limit(1);

  if (campaign.length === 0) {
    return NextResponse.json(
      { error: 'Campaign not found or access denied', code: 'CAMPAIGN_NOT_FOUND' },
      { status: 404 }
    );
  }

  // Update campaign status to paused
  await db.update(Campaigns)
    .set({
      status: 'paused',
      updatedAt: new Date()
    })
    .where(and(eq(Campaigns.id, campaignId), eq(Campaigns.userId, userId)));

  // Update all queued messages to paused
  await db.update(Messages)
    .set({
      status: 'paused',
      updatedAt: new Date()
    })
    .where(
      and(
        eq(Messages.campaignId, campaignId),
        eq(Messages.status, 'queued')
      )
    );

  return NextResponse.json({
    success: true,
    message: 'Automation paused successfully'
  });
}

async function resumeAutomation(db: any, userId: string, campaignId: string) {
  // Verify campaign ownership first
  const campaign = await db
    .select()
    .from(Campaigns)
    .where(
      and(
        eq(Campaigns.id, campaignId),
        eq(Campaigns.userId, userId)
      )
    )
    .limit(1);

  if (campaign.length === 0) {
    return NextResponse.json(
      { error: 'Campaign not found', code: 'CAMPAIGN_NOT_FOUND' },
      { status: 404 }
    );
  }

  // Update campaign status to active
  await db.update(Campaigns)
    .set({
      status: 'active',
      updatedAt: new Date()
    })
    .where(
      and(
        eq(Campaigns.id, campaignId),
        eq(Campaigns.userId, userId)
      )
    );

  // Update paused messages back to queued
  await db.update(Messages)
    .set({
      status: 'queued',
      updatedAt: new Date()
    })
    .where(
      and(
        eq(Messages.campaignId, campaignId),
        eq(Messages.status, 'paused')
      )
    );

  return NextResponse.json({
    success: true,
    message: 'Automation resumed successfully'
  });
}
async function getAutomationStatus(db: any, userId: string, campaignId?: string) {
  const whereConditions = [eq(Campaigns.userId, userId)];
  if (campaignId) {
    whereConditions.push(eq(Campaigns.id, campaignId));
  }

  const campaigns = await db.select({
    id: Campaigns.id,
    name: Campaigns.name,
    status: Campaigns.status,
    startDate: Campaigns.startDate,
    createdAt: Campaigns.createdAt,
    messageCount: sql<number>`count(${Messages.id})`,
    sentCount: sql<number>`count(case when ${Messages.status} = 'sent' then 1 end)`,
    queuedCount: sql<number>`count(case when ${Messages.status} = 'queued' then 1 end)`,
    failedCount: sql<number>`count(case when ${Messages.status} = 'failed' then 1 end)`
  })
  .from(Campaigns)
  .leftJoin(Messages, eq(Campaigns.id, Messages.campaignId))
  .where(and(...whereConditions))
  .groupBy(Campaigns.id, Campaigns.name, Campaigns.status, Campaigns.startDate, Campaigns.createdAt);

  return NextResponse.json({ campaigns });
}

async function getScheduledJobs(db: any, userId: string) {
  const jobs = await db.select({
    id: Messages.id,
    campaignId: Messages.campaignId,
    campaignName: Campaigns.name,
    contactEmail: Contacts.email,
    subject: Messages.subject,
    scheduledAt: Messages.scheduledAt,
    status: Messages.status
  })
  .from(Messages)
  .innerJoin(Campaigns, eq(Messages.campaignId, Campaigns.id))
  .innerJoin(Contacts, eq(Messages.contactId, Contacts.id))
  .where(
    and(
      eq(Campaigns.userId, userId),
      eq(Messages.status, 'queued'),
      sql`${Messages.scheduledAt} > now()`
    )
  )
  .orderBy(Messages.scheduledAt)
  .limit(100);

  return NextResponse.json({ jobs });
}

async function getExecutionQueue(db: any, userId: string, campaignId?: string) {
  const whereConditions = [
    eq(Campaigns.userId, userId),
    sql`${Messages.status} in ('queued', 'processing')`
  ];

  if (campaignId) {
    whereConditions.push(eq(Messages.campaignId, campaignId));
  }

  const queue = await db.select({
    id: Messages.id,
    campaignId: Messages.campaignId,
    campaignName: Campaigns.name,
    contactEmail: Contacts.email,
    subject: Messages.subject,
    scheduledAt: Messages.scheduledAt,
    status: Messages.status,
    retryCount: Messages.retryCount
  })
  .from(Messages)
  .innerJoin(Campaigns, eq(Messages.campaignId, Campaigns.id))
  .innerJoin(Contacts, eq(Messages.contactId, Contacts.id))
  .where(and(...whereConditions))
  .orderBy(Messages.scheduledAt)
  .limit(50);

  return NextResponse.json({ queue });
}
