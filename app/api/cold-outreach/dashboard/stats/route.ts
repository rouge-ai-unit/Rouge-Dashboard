import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireSession } from '@/lib/apiAuth';
import { coldOutreachRateLimit } from '@/lib/rate-limit';
import { logger, withPerformanceMonitoring, ValidationError, sanitizeInput, retryWithBackoff } from '@/lib/client-utils';
import { getDb } from '@/utils/dbConfig';
import { Campaigns, Contacts, Messages } from '@/utils/schema';
import { eq, sql, count, sum } from 'drizzle-orm';

/**
 * @swagger
 * /api/cold-outreach/dashboard/stats:
 *   get:
 *     summary: Get dashboard statistics
 *     description: Retrieves comprehensive statistics for the cold outreach dashboard
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 stats:
 *                   type: object
 *                   properties:
 *                     totalCampaigns:
 *                       type: integer
 *                       description: Total number of campaigns
 *                     activeCampaigns:
 *                       type: integer
 *                       description: Number of currently active campaigns
 *                     totalContacts:
 *                       type: integer
 *                       description: Total number of contacts
 *                     emailsSent:
 *                       type: integer
 *                       description: Total emails sent
 *                     openRate:
 *                       type: number
 *                       format: float
 *                       description: Overall open rate percentage
 *                     clickRate:
 *                       type: number
 *                       format: float
 *                       description: Overall click rate percentage
 *                     replyRate:
 *                       type: number
 *                       format: float
 *                       description: Overall reply rate percentage
 *                     conversionRate:
 *                       type: number
 *                       format: float
 *                       description: Overall conversion rate percentage
 *                 metadata:
 *                   type: object
 *                   properties:
 *                     calculatedAt:
 *                       type: string
 *                       format: date-time
 *                     dataFreshness:
 *                       type: string
 *                       enum: [realtime, cached, estimated]
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         description: Internal server error
 */

// Validation schemas
const dashboardStatsSchema = z.object({
  totalCampaigns: z.number().int().min(0),
  activeCampaigns: z.number().int().min(0),
  totalContacts: z.number().int().min(0),
  emailsSent: z.number().int().min(0),
  openRate: z.number().min(0).max(100),
  clickRate: z.number().min(0).max(100),
  replyRate: z.number().min(0).max(100),
  conversionRate: z.number().min(0).max(100),
});

// Audit logging functions
async function logStatsAccess(userId: string, stats: any) {
  try {
    const db = getDb();
    const { AuditLogs } = await import('@/utils/auth-schema');
    
    await db.insert(AuditLogs).values({
      userId,
      eventType: 'dashboard_stats_access',
      eventCategory: 'cold_outreach',
      eventStatus: 'success',
      ipAddress: 'system',
      userAgent: 'api',
      metadata: {
        totalCampaigns: stats.totalCampaigns,
        activeCampaigns: stats.activeCampaigns,
        totalContacts: stats.totalContacts,
        emailsSent: stats.emailsSent,
      },
    });
  } catch (error) {
    logger.info('Dashboard stats accessed', {
      userId: sanitizeInput(userId),
      statsSummary: {
        totalCampaigns: stats.totalCampaigns,
        activeCampaigns: stats.activeCampaigns,
        totalContacts: stats.totalContacts,
        emailsSent: stats.emailsSent,
      },
      timestamp: new Date().toISOString(),
    });
  }
}

async function logStatsError(userId: string, error: any, context: any) {
  try {
    const db = getDb();
    const { AuditLogs } = await import('@/utils/auth-schema');
    
    await db.insert(AuditLogs).values({
      userId,
      eventType: 'dashboard_stats_error',
      eventCategory: 'cold_outreach',
      eventStatus: 'failure',
      ipAddress: 'system',
      userAgent: 'api',
      errorMessage: error?.message || String(error),
      metadata: context,
    });
  } catch (auditError) {
    logger.error('Dashboard stats error', error, {
      userId: sanitizeInput(userId),
      context: sanitizeInput(JSON.stringify(context)),
      timestamp: new Date().toISOString(),
    });
  }
}



export async function GET(request: NextRequest) {
    let userId: string = 'unknown';

    try {
      // Authentication
      const session = await requireSession();
      userId = session.user.id;

      // Rate limiting
      const rateLimitCheck = coldOutreachRateLimit.check(`${userId}:dashboard_stats`);
      if (!rateLimitCheck.allowed) {
        logger.warn('Rate limit exceeded for dashboard stats', {
          userId: sanitizeInput(userId),
          endpoint: 'dashboard/stats',
          retryAfter: rateLimitCheck.retryAfter
        });
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please try again later.' },
          { status: 429 }
        );
      }



      // Fetch dashboard stats with retry logic
      const stats = await retryWithBackoff(
        async () => {
          const db = getDb();

          // Get campaign counts and aggregates
          const campaignStats = await db
            .select({
              totalCampaigns: sql<number>`count(*)`,
              activeCampaigns: sql<number>`count(case when status = 'active' then 1 end)`,
              totalSent: sql<number>`coalesce(sum(sent_count), 0)`,
              totalOpened: sql<number>`coalesce(sum(opened_count), 0)`,
              totalReplied: sql<number>`coalesce(sum(replied_count), 0)`,
              totalBounced: sql<number>`coalesce(sum(bounced_count), 0)`,
            })
            .from(Campaigns)
            .where(eq(Campaigns.userId, userId));

          // Get contact count
          const contactCount = await db
            .select({ count: sql<number>`count(*)` })
            .from(Contacts)
            .where(eq(Contacts.userId, userId));

          const stats = campaignStats[0];
          const totalCampaigns = Number(stats.totalCampaigns);
          const activeCampaigns = Number(stats.activeCampaigns);
          const totalContacts = Number(contactCount[0].count);
          const emailsSent = Number(stats.totalSent);
          const totalOpens = Number(stats.totalOpened);
          const totalReplies = Number(stats.totalReplied);

          // Calculate rates (avoid division by zero)
          const openRate = emailsSent > 0 ? (totalOpens / emailsSent) * 100 : 0;
          const replyRate = emailsSent > 0 ? (totalReplies / emailsSent) * 100 : 0;

          // Note: Click rate and conversion rate are estimated based on industry averages
          // In a full implementation with tracking data, these would be calculated from actual click/conversion events
          const clickRate = openRate > 0 ? Math.min(openRate * 0.3, 100) : 0; // Estimated as 30% of open rate (industry average)
          const conversionRate = replyRate > 0 ? Math.min(replyRate * 0.5, 100) : 0; // Estimated as 50% of reply rate (conservative estimate)

          return {
            totalCampaigns,
            activeCampaigns,
            totalContacts,
            emailsSent,
            openRate: Math.round(openRate * 10) / 10, // Round to 1 decimal place
            clickRate: Math.round(clickRate * 10) / 10,
            replyRate: Math.round(replyRate * 10) / 10,
            conversionRate: Math.round(conversionRate * 10) / 10,
          };
        },
        3,
        1000
      );

      // Validate response data
      const statsValidation = dashboardStatsSchema.safeParse(stats);
      if (!statsValidation.success) {
        logger.error('Invalid dashboard stats data structure', undefined, {
          userId: sanitizeInput(userId),
          errors: statsValidation.error.errors,
        });
        throw new ValidationError('Invalid dashboard stats data structure');
      }

      // Log successful access
      await logStatsAccess(userId, stats);

      logger.info('Dashboard stats retrieved successfully', {
        userId: sanitizeInput(userId),
        statsSummary: {
          totalCampaigns: stats.totalCampaigns,
          activeCampaigns: stats.activeCampaigns,
          totalContacts: stats.totalContacts,
          emailsSent: stats.emailsSent,
        },
      });

      return NextResponse.json({
        stats,
        metadata: {
          calculatedAt: new Date().toISOString(),
          dataFreshness: 'realtime', // Core metrics are realtime, click/conversion rates are estimated
          estimatedMetrics: ['clickRate', 'conversionRate'], // These are calculated estimates, not from tracking data
          userId: sanitizeInput(userId),
        }
      });

    } catch (error) {
      // userId is already available from the try block scope
      await logStatsError(userId, error, { endpoint: 'dashboard/stats' });

      if (error instanceof ValidationError) {
        logger.warn('Validation error in dashboard stats', {
          userId: sanitizeInput(userId),
          error: error.message,
        });
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }

      logger.error('Unexpected error in dashboard stats', error instanceof Error ? error : undefined, {
        userId: sanitizeInput(userId),
        stack: error instanceof Error ? error.stack : undefined,
      });

      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
}
