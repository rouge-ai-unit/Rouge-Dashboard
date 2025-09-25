import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireSession } from '@/lib/apiAuth';
import { coldOutreachRateLimit } from '@/lib/rate-limit';
import { logger, withPerformanceMonitoring, ValidationError, sanitizeInput, retryWithBackoff } from '@/lib/client-utils';
import { getDb } from '@/utils/dbConfig';
import { Messages, Campaigns, Contacts } from '@/utils/schema';
import { eq, and, lte, sql } from 'drizzle-orm';
import { sendEmail } from '@/lib/sendgrid';

/**
 * @swagger
 * /api/cold-outreach/jobs:
 *   post:
 *     summary: Background job processor for cold outreach operations
 *     description: Handles background processing of email queues, retries, and cleanup operations
 *     security:
 *       - bearerAuth: []
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - action
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [process_queue, retry_failed, cleanup_old_jobs]
 *               batchSize:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 100
 *                 default: 10
 *     responses:
 *       200:
 *         description: Job processed successfully
 *       400:
 *         description: Invalid request parameters
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         description: Internal server error
 */

// Validation schemas
const jobRequestSchema = z.object({
  action: z.enum(['process_queue', 'retry_failed', 'cleanup_old_jobs']),
  batchSize: z.number().int().min(1).max(100).default(10),
});

// Audit logging functions
async function logJobOperation(action: string, result: any, userId?: string) {
  logger.info('Job operation performed', {
    action: sanitizeInput(action),
    result: sanitizeInput(JSON.stringify(result)),
    userId: userId ? sanitizeInput(userId) : 'system',
    timestamp: new Date().toISOString(),
  });
}

async function logJobError(action: string, error: any, context: any, userId?: string) {
  logger.error('Job operation error', error, {
    action: sanitizeInput(action),
    context: sanitizeInput(JSON.stringify(context)),
    userId: userId ? sanitizeInput(userId) : 'system',
    timestamp: new Date().toISOString(),
  });
}

export async function POST(request: NextRequest) {
    let userId: string | undefined;

    try {
      // Authentication - allow both API key and session auth
      const authHeader = request.headers.get('authorization');
      const apiKey = process.env.CRON_API_KEY;

      if (apiKey && authHeader === `Bearer ${apiKey}`) {
        userId = 'system'; // System operation
      } else {
        const session = await requireSession();
        userId = session.user.id;
      }

      // Rate limiting (skip for system operations)
      if (userId !== 'system') {
        const rateLimitCheck = coldOutreachRateLimit.check(`${userId}:jobs`);
        if (!rateLimitCheck.allowed) {
          logger.warn('Rate limit exceeded for job operations', {
            userId: sanitizeInput(userId),
            endpoint: 'jobs',
            retryAfter: rateLimitCheck.retryAfter
          });
          return NextResponse.json(
            { error: 'Rate limit exceeded. Please try again later.' },
            { status: 429 }
          );
        }
      }

      // Parse and validate request body
      const body = await request.json();
      const validation = jobRequestSchema.safeParse(body);
      if (!validation.success) {
        logger.warn('Invalid job request parameters', {
          userId: userId ? sanitizeInput(userId) : 'unknown',
          errors: validation.error.errors,
        });
        throw new ValidationError(`Invalid request parameters: ${validation.error.errors.map(e => e.message).join(', ')}`);
      }

      const { action, batchSize } = validation.data;

      // Execute job with retry logic
      const result = await retryWithBackoff(
        async () => {
          switch (action) {
            case 'process_queue':
              return await processEmailQueue(batchSize);
            case 'retry_failed':
              return await retryFailedEmails(batchSize);
            case 'cleanup_old_jobs':
              return await cleanupOldJobs();
            default:
              throw new ValidationError('Invalid action');
          }
        },
        2,
        2000
      );

      // Log successful job execution
      await logJobOperation(action, result, userId);

      logger.info('Job operation completed successfully', {
        action,
        userId: userId ? sanitizeInput(userId) : 'system',
        result: sanitizeInput(JSON.stringify(result)),
      });

      return result;

    } catch (error) {
      await logJobError('unknown', error, { endpoint: 'jobs' }, userId);

      if (error instanceof ValidationError) {
        logger.warn('Validation error in job operation', {
          userId: userId ? sanitizeInput(userId) : 'unknown',
          error: error.message,
        });
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }

      logger.error('Unexpected error in job operation', error instanceof Error ? error : undefined, {
        userId: userId ? sanitizeInput(userId) : 'unknown',
        stack: error instanceof Error ? error.stack : undefined,
      });

      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }

}

async function processEmailQueue(batchSize: number) {
  const db = getDb();

  try {
    // Get queued messages that are ready to be sent
    const queuedMessages = await db.select({
      id: Messages.id,
      campaignId: Messages.campaignId,
      contactId: Messages.contactId,
      subject: Messages.subject,
      content: Messages.content,
      contactEmail: Contacts.email,
      contactName: Contacts.name,
      campaignName: Campaigns.name,
      userId: Campaigns.userId
    })
    .from(Messages)
    .innerJoin(Contacts, eq(Messages.contactId, Contacts.id))
    .innerJoin(Campaigns, eq(Messages.campaignId, Campaigns.id))
    .where(
      and(
        eq(Messages.status, 'queued'),
        lte(Messages.scheduledAt, new Date().toISOString()),
        eq(Campaigns.status, 'active')
      )
    )
    .orderBy(Messages.scheduledAt)
    .limit(batchSize);

    const results = {
      processed: 0,
      sent: 0,
      failed: 0,
      errors: [] as Array<{ messageId: string; error: string }>
    };

    for (const message of queuedMessages) {
      try {
        // Mark as processing
        await db.update(Messages)
          .set({
            status: 'processing',
            updatedAt: new Date().toISOString()
          })
          .where(eq(Messages.id, message.id));

        // Send email with retry
        const emailResult = await retryWithBackoff(
          async () => sendEmail({
            to: message.contactEmail,
            subject: message.subject,
            text: message.content.replace(/<[^>]*>/g, ''), // Strip HTML for text version
            html: message.content
          }),
          2,
          1000
        );

        if (emailResult.success) {
          // Mark as sent
          await db.update(Messages)
            .set({
              status: 'sent',
              sentAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            })
            .where(eq(Messages.id, message.id));

          results.sent++;
          logger.info('Email sent successfully', {
            messageId: sanitizeInput(message.id),
            campaignId: sanitizeInput(message.campaignId),
            contactEmail: sanitizeInput(message.contactEmail),
          });
        } else {
          // Mark as failed
          await db.update(Messages)
            .set({
              status: 'failed',
              errorMessage: emailResult.error,
              retryCount: sql`${Messages.retryCount} + 1`,
              updatedAt: new Date().toISOString()
            })
            .where(eq(Messages.id, message.id));

          results.failed++;
          results.errors.push({
            messageId: message.id,
            error: emailResult.error || 'Unknown error'
          });

          logger.warn('Email send failed', {
            messageId: sanitizeInput(message.id),
            campaignId: sanitizeInput(message.campaignId),
            contactEmail: sanitizeInput(message.contactEmail),
            error: sanitizeInput(emailResult.error || 'Unknown error'),
          });
        }

        results.processed++;
      } catch (error) {
        logger.error('Failed to process message', error instanceof Error ? error : undefined, {
          messageId: sanitizeInput(message.id),
          campaignId: sanitizeInput(message.campaignId),
          contactEmail: sanitizeInput(message.contactEmail),
        });

        // Mark as failed
        await db.update(Messages)
          .set({
            status: 'failed',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            retryCount: sql`${Messages.retryCount} + 1`,
            updatedAt: new Date().toISOString()
          })
          .where(eq(Messages.id, message.id));

        results.failed++;
        results.errors.push({
          messageId: message.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      success: true,
      results,
      message: `Processed ${results.processed} messages: ${results.sent} sent, ${results.failed} failed`,
      metadata: {
        batchSize,
        processedAt: new Date().toISOString(),
      }
    });
  } catch (error) {
    logger.error('Process email queue error', error instanceof Error ? error : undefined, {
      batchSize,
    });
    throw error;
  }
}

async function retryFailedEmails(batchSize: number) {
  const db = getDb();

  // Get failed messages with retry count < 3
  const failedMessages = await db.select({
    id: Messages.id,
    campaignId: Messages.campaignId,
    contactId: Messages.contactId,
    subject: Messages.subject,
    content: Messages.content,
    contactEmail: Contacts.email,
    contactName: Contacts.name,
    campaignName: Campaigns.name,
    userId: Campaigns.userId,
    retryCount: Messages.retryCount
  })
  .from(Messages)
  .innerJoin(Contacts, eq(Messages.contactId, Contacts.id))
  .innerJoin(Campaigns, eq(Messages.campaignId, Campaigns.id))
  .where(
    and(
      eq(Messages.status, 'failed'),
      sql`${Messages.retryCount} < 3`,
      eq(Campaigns.status, 'active')
    )
  )
  .orderBy(Messages.updatedAt)
  .limit(batchSize);

  const results = {
    processed: 0,
    sent: 0,
    failed: 0,
    errors: [] as Array<{ messageId: string; error: string | undefined }>
  };

  for (const message of failedMessages) {
    try {
      // Mark as processing
      await db.update(Messages)
        .set({
          status: 'processing',
          updatedAt: new Date().toISOString()
        })
        .where(eq(Messages.id, message.id));

      // Send email
      const emailResult = await sendEmail({
        to: message.contactEmail,
        subject: message.subject,
        text: message.content.replace(/<[^>]*>/g, ''), // Strip HTML for text version
        html: message.content
      });

      if (emailResult.success) {
        // Mark as sent
        await db.update(Messages)
          .set({
            status: 'sent',
            sentAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          })
          .where(eq(Messages.id, message.id));

        results.sent++;
      } else {
        // Increment retry count and keep as failed
        await db.update(Messages)
          .set({
            status: 'failed',
            errorMessage: emailResult.error,
            retryCount: sql`${Messages.retryCount} + 1`,
            updatedAt: new Date().toISOString()
          })
          .where(eq(Messages.id, message.id));

        results.failed++;
        results.errors.push({
          messageId: message.id,
          error: emailResult.error
        });
      }

      results.processed++;
    } catch (error) {
      logger.error('Failed to retry message', error instanceof Error ? error : undefined, {
        messageId: sanitizeInput(message.id),
        userId: sanitizeInput(message.userId)
      });

      // Increment retry count
      await db.update(Messages)
        .set({
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          retryCount: sql`${Messages.retryCount} + 1`,
          updatedAt: new Date().toISOString()
        })
        .where(eq(Messages.id, message.id));

      results.failed++;
      results.errors.push({
        messageId: message.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  return NextResponse.json({
    success: true,
    results,
    message: `Retried ${results.processed} messages: ${results.sent} sent, ${results.failed} failed`
  });
}

async function cleanupOldJobs() {
  const db = getDb();

  // Delete old completed jobs (older than 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const deletedCount = await db.delete(Messages)
    .where(
      and(
        sql`${Messages.status} in ('sent', 'failed')`,
        sql`${Messages.updatedAt} < ${thirtyDaysAgo}`
      )
    );

  return NextResponse.json({
    success: true,
    deletedCount: deletedCount.rowCount,
    message: `Cleaned up ${deletedCount.rowCount} old job records`
  });
}
