import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireSession } from '@/lib/apiAuth';
import { coldOutreachRateLimit } from '@/lib/rate-limit';
import { logger, withPerformanceMonitoring, ValidationError, sanitizeInput, retryWithBackoff } from '@/lib/client-utils';
import { getDb } from '@/utils/dbConfig';
import { Campaigns, Contacts, Messages } from '@/utils/schema';
import { eq, desc, sql, and, gte } from 'drizzle-orm';

/**
 * @swagger
 * /api/cold-outreach/dashboard/activities:
 *   get:
 *     summary: Get recent dashboard activities
 *     description: Retrieves recent activities for the cold outreach dashboard
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *         description: Number of activities to return
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [campaign_created, emails_sent, contact_added, template_used]
 *         description: Filter activities by type
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [success, warning, error]
 *         description: Filter activities by status
 *     responses:
 *       200:
 *         description: Recent activities retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 activities:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       type:
 *                         type: string
 *                         enum: [campaign_created, emails_sent, contact_added, template_used]
 *                       description:
 *                         type: string
 *                       timestamp:
 *                         type: string
 *                         format: date-time
 *                       status:
 *                         type: string
 *                         enum: [success, warning, error]
 *                       metadata:
 *                         type: object
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
const querySchema = z.object({
  limit: z.string().optional().transform(val => val ? Math.min(parseInt(val), 50) : 10),
  type: z.enum(['campaign_created', 'emails_sent', 'contact_added', 'template_used']).optional(),
  status: z.enum(['success', 'warning', 'error']).optional(),
});

const activitySchema = z.object({
  id: z.string(),
  type: z.enum(['campaign_created', 'emails_sent', 'contact_added', 'template_used']),
  description: z.string(),
  timestamp: z.date(),
  status: z.enum(['success', 'warning', 'error']).optional(),
  metadata: z.record(z.any()).optional(),
});

// Audit logging functions
async function logActivityAccess(userId: string, filters: any, resultCount: number) {
  try {
    const db = getDb();
    const { AuditLogs } = await import('@/utils/auth-schema');
    
    await db.insert(AuditLogs).values({
      userId,
      eventType: 'dashboard_activities_access',
      eventCategory: 'cold_outreach',
      eventStatus: 'success',
      ipAddress: 'system',
      userAgent: 'api',
      metadata: {
        filters: sanitizeInput(JSON.stringify(filters)),
        resultCount,
      },
    });
  } catch (error) {
    logger.info('Dashboard activities accessed', {
      userId: sanitizeInput(userId),
      filters: sanitizeInput(JSON.stringify(filters)),
      resultCount,
      timestamp: new Date().toISOString(),
    });
  }
}

async function logActivityError(userId: string, error: any, context: any) {
  try {
    const db = getDb();
    const { AuditLogs } = await import('@/utils/auth-schema');
    
    await db.insert(AuditLogs).values({
      userId,
      eventType: 'dashboard_activities_error',
      eventCategory: 'cold_outreach',
      eventStatus: 'failure',
      ipAddress: 'system',
      userAgent: 'api',
      errorMessage: error?.message || String(error),
      metadata: context,
    });
  } catch (auditError) {
    logger.error('Dashboard activities error', error, {
      userId: sanitizeInput(userId),
      context: sanitizeInput(JSON.stringify(context)),
      timestamp: new Date().toISOString(),
    });
  }
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  let userId: string = 'unknown';

  try {
      // Authentication
      const session = await requireSession();
      userId = session.user.id;

      // Rate limiting
      const rateLimitCheck = coldOutreachRateLimit.check(`${userId}:dashboard_activities`);
      if (!rateLimitCheck.allowed) {
        logger.warn('Rate limit exceeded for dashboard activities', {
          userId: sanitizeInput(userId),
          retryAfter: rateLimitCheck.retryAfter
        });
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please try again later.' },
          { status: 429 }
        );
      }

      // Parse and validate query parameters
      const { searchParams } = new URL(request.url);
      const queryValidation = querySchema.safeParse({
        limit: searchParams.get('limit') ?? undefined,
        type: searchParams.get('type') ?? undefined,
        status: searchParams.get('status') ?? undefined,
      });

      if (!queryValidation.success) {
        logger.warn('Invalid query parameters for dashboard activities', {
          userId: sanitizeInput(userId),
          errors: queryValidation.error.errors,
        });
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

      const { limit, type, status } = queryValidation.data;

      logger.info('Fetching dashboard activities', {
        userId: sanitizeInput(userId),
        limit,
        type,
        status,
        timestamp: new Date().toISOString(),
      });



      const db = getDb();

      // Get recent data with retry logic
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [
        recentCampaigns,
        recentContacts,
        messageStats,
      ] = await Promise.all([
        retryWithBackoff(
          () => db.select({
            id: Campaigns.id,
            name: Campaigns.name,
            createdAt: Campaigns.createdAt,
            sentCount: sql<number>`COALESCE(${Campaigns.sentCount}, 0)`,
          })
          .from(Campaigns)
          .where(and(
            eq(Campaigns.userId, userId),
            gte(Campaigns.createdAt, thirtyDaysAgo.toISOString())
          ))
          .orderBy(desc(Campaigns.createdAt))
          .limit(20),
          3,
          1000
        ),
        retryWithBackoff(
          () => db.select({
            id: Contacts.id,
            name: Contacts.name,
            email: Contacts.email,
            createdAt: Contacts.createdAt,
          })
          .from(Contacts)
          .where(and(
            eq(Contacts.userId, userId),
            gte(Contacts.createdAt, thirtyDaysAgo.toISOString())
          ))
          .orderBy(desc(Contacts.createdAt))
          .limit(20),
          3,
          1000
        ),
        retryWithBackoff(
          () => db.select({
            campaignId: Messages.campaignId,
            campaignName: Campaigns.name,
            count: sql<number>`count(*)`,
          })
          .from(Messages)
          .innerJoin(Campaigns, eq(Messages.campaignId, Campaigns.id))
          .where(and(
            eq(Campaigns.userId, userId),
            gte(Messages.createdAt, thirtyDaysAgo.toISOString()),
            eq(Messages.status, 'sent')
          ))
          .groupBy(Messages.campaignId, Campaigns.name)
          .orderBy(desc(sql`count(*)`))
          .limit(10),
          3,
          1000
        ),
      ]);

      // Build activities array
      const activitiesArray: Array<{
        id: string;
        type: 'campaign_created' | 'emails_sent' | 'contact_added' | 'template_used';
        description: string;
        timestamp: Date;
        status?: 'success' | 'warning' | 'error';
        metadata?: Record<string, any>;
      }> = [];

      // Add campaign creation activities
      recentCampaigns.forEach(campaign => {
        if (campaign.createdAt) {
          activitiesArray.push({
            id: `campaign_${campaign.id}`,
            type: 'campaign_created',
            description: `Created "${campaign.name}" campaign`,
            timestamp: new Date(campaign.createdAt),
            status: 'success',
            metadata: {
              campaignId: campaign.id,
              campaignName: campaign.name,
              sentCount: campaign.sentCount || 0,
            }
          });
        }
      });

      // Add email sending activities
      messageStats.forEach(stat => {
        activitiesArray.push({
          id: `emails_sent_${stat.campaignId}`,
          type: 'emails_sent',
          description: `Sent ${stat.count} emails for "${stat.campaignName}" campaign`,
          timestamp: new Date(), // Use current time as approximation
          status: 'success',
          metadata: {
            campaignId: stat.campaignId,
            campaignName: stat.campaignName,
            emailsSent: stat.count,
          }
        });
      });

      // Add contact addition activities
      recentContacts.forEach(contact => {
        if (contact.createdAt) {
          activitiesArray.push({
            id: `contact_${contact.id}`,
            type: 'contact_added',
            description: `Added contact "${contact.name}" (${contact.email})`,
            timestamp: new Date(contact.createdAt),
            status: 'success',
            metadata: {
              contactId: contact.id,
              contactName: contact.name,
              contactEmail: contact.email,
            }
          });
        }
      });

      // Sort activities by timestamp (most recent first)
      activitiesArray.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      // Apply filters
      let filteredActivities = activitiesArray;

      if (type) {
        filteredActivities = filteredActivities.filter(activity => activity.type === type);
      }

      if (status) {
        filteredActivities = filteredActivities.filter(activity => activity.status === status);
      }

      // Apply limit
      const limitedActivities = filteredActivities.slice(0, limit);

      // Validate and transform activities
      const validatedActivities = limitedActivities.map(activity => {
        const validation = activitySchema.safeParse(activity);
        if (!validation.success) {
          logger.warn('Invalid activity data', {
            userId: sanitizeInput(userId),
            activity: sanitizeInput(JSON.stringify(activity)),
            errors: validation.error.errors,
          });
          return null;
        }
        return validation.data;
      }).filter((activity): activity is NonNullable<typeof activity> => activity !== null);

      const responseTime = Date.now() - startTime;

      logger.info('Dashboard activities retrieved successfully', {
        userId: sanitizeInput(userId),
        totalActivities: activitiesArray.length,
        filteredActivities: limitedActivities.length,
        responseTime,
        timestamp: new Date().toISOString(),
      });

      // Log access for audit
      await logActivityAccess(userId, { limit, type, status }, validatedActivities.length);

      return NextResponse.json({
        activities: validatedActivities,
        metadata: {
          total: activitiesArray.length,
          filtered: limitedActivities.length,
          limit,
          type,
          status,
          responseTime,
          timestamp: new Date().toISOString(),
        }
      });

    }

    catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      logger.error('Dashboard activities failed', error instanceof Error ? error : new Error(String(error)), {
        userId: sanitizeInput(userId),
        responseTime,
        timestamp: new Date().toISOString(),
      });

      if (error instanceof ValidationError) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }

}
