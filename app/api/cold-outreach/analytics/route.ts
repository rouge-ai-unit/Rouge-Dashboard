import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { coldOutreachRateLimit } from '@/lib/rate-limit';
import { getDb } from '@/utils/dbConfig';
import { Campaigns, Contacts, Messages, Templates } from '@/utils/schema';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import { z } from 'zod';
import { logger, withPerformanceMonitoring, ValidationError, retryWithBackoff, sanitizeInput } from '@/lib/client-utils';

/**
 * Zod validation schemas for analytics operations
 */
const analyticsQuerySchema = z.object({
  timeRange: z.enum(['7d', '30d', '90d']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  campaignId: z.string().optional().transform((val) => {
    const trimmed = val?.trim();
    if (!trimmed || trimmed.toLowerCase() === 'all') return undefined;
    return trimmed;
  }),
  includeAdvanced: z.string().optional().transform((val) => val === 'true'),
});

/**
 * Audit logging functions for analytics operations
 */
async function auditAnalyticsOperation(
  operation: string,
  userId: string,
  metadata?: Record<string, any>
) {
  logger.info(`Analytics ${operation}`, {
    userId,
    operation,
    resource: 'analytics',
    ...metadata,
    timestamp: new Date().toISOString(),
    source: 'api:cold-outreach:analytics'
  });
}

/**
 * Generate performance insights from message data
 */
async function generatePerformanceInsights(messages: any[]) {
  try {
    const dayPerformance = new Map<string, { sent: number; opened: number; replied: number }>();
    const hourPerformance = new Map<number, { sent: number; opened: number; replied: number }>();
    
    messages.forEach(msg => {
      if (!msg.createdAt) return;
      
      const date = new Date(msg.createdAt);
      const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });
      const hour = date.getHours();
      
      // Track by day
      if (!dayPerformance.has(dayOfWeek)) {
        dayPerformance.set(dayOfWeek, { sent: 0, opened: 0, replied: 0 });
      }
      const dayStats = dayPerformance.get(dayOfWeek)!;
      dayStats.sent++;
      if (msg.status === 'opened' || msg.status === 'replied') dayStats.opened++;
      if (msg.status === 'replied') dayStats.replied++;
      
      // Track by hour
      if (!hourPerformance.has(hour)) {
        hourPerformance.set(hour, { sent: 0, opened: 0, replied: 0 });
      }
      const hourStats = hourPerformance.get(hour)!;
      hourStats.sent++;
      if (msg.status === 'opened' || msg.status === 'replied') hourStats.opened++;
      if (msg.status === 'replied') hourStats.replied++;
    });
    
    // Calculate best days
    const bestDaysOfWeek = Array.from(dayPerformance.entries())
      .map(([day, stats]) => ({
        day,
        openRate: stats.sent > 0 ? (stats.opened / stats.sent) * 100 : 0,
        replyRate: stats.sent > 0 ? (stats.replied / stats.sent) * 100 : 0,
        totalSent: stats.sent,
      }))
      .sort((a, b) => b.replyRate - a.replyRate);
    
    // Calculate best hours
    const bestSendHours = Array.from(hourPerformance.entries())
      .map(([hour, stats]) => ({
        hour,
        openRate: stats.sent > 0 ? (stats.opened / stats.sent) * 100 : 0,
        replyRate: stats.sent > 0 ? (stats.replied / stats.sent) * 100 : 0,
        totalSent: stats.sent,
      }))
      .sort((a, b) => b.replyRate - a.replyRate);
    
    // Generate recommendations
    const recommendations = [];
    if (bestDaysOfWeek.length > 0) {
      recommendations.push(`Best day to send: ${bestDaysOfWeek[0].day} (${bestDaysOfWeek[0].replyRate.toFixed(1)}% reply rate)`);
    }
    if (bestSendHours.length > 0) {
      const bestHour = bestSendHours[0].hour;
      const timeStr = bestHour === 0 ? '12 AM' : bestHour < 12 ? `${bestHour} AM` : bestHour === 12 ? '12 PM' : `${bestHour - 12} PM`;
      recommendations.push(`Best time to send: ${timeStr} (${bestSendHours[0].replyRate.toFixed(1)}% reply rate)`);
    }
    
    return { bestDaysOfWeek, bestSendHours, recommendations };
  } catch (error) {
    logger.error('Error generating performance insights', error as Error);
    return { bestDaysOfWeek: [], bestSendHours: [], recommendations: [] };
  }
}

/**
 * Generate predictive analytics based on historical data
 */
async function generatePredictiveAnalytics(messages: any[], campaigns: any[]) {
  try {
    const totalSent = messages.filter(m => m.status === 'sent' || m.status === 'opened' || m.status === 'replied').length;
    const totalOpened = messages.filter(m => m.status === 'opened' || m.status === 'replied').length;
    const totalReplied = messages.filter(m => m.status === 'replied').length;
    
    const currentPerformance = {
      openRate: totalSent > 0 ? (totalOpened / totalSent) * 100 : 0,
      replyRate: totalSent > 0 ? (totalReplied / totalSent) * 100 : 0,
      totalSent,
      totalOpened,
      totalReplied,
    };
    
    // Simple prediction: assume 5% improvement with optimization
    const predictedPerformance = {
      openRate: currentPerformance.openRate * 1.05,
      replyRate: currentPerformance.replyRate * 1.05,
      estimatedIncrease: {
        opens: Math.round(totalSent * 0.05 * (currentPerformance.openRate / 100)),
        replies: Math.round(totalSent * 0.05 * (currentPerformance.replyRate / 100)),
      },
    };
    
    const recommendations = [];
    if (currentPerformance.openRate < 20) {
      recommendations.push('Consider improving subject lines to increase open rates');
    }
    if (currentPerformance.replyRate < 5) {
      recommendations.push('Add stronger call-to-actions to improve reply rates');
    }
    if (campaigns.filter((c: any) => c.status === 'active').length > 5) {
      recommendations.push('Consider consolidating campaigns for better focus');
    }
    
    return { currentPerformance, predictedPerformance, recommendations };
  } catch (error) {
    logger.error('Error generating predictive analytics', error as Error);
    return { currentPerformance: {}, predictedPerformance: {}, recommendations: [] };
  }
}

/**
 * Segment contacts based on engagement
 */
async function segmentContacts(messages: any[], contactsResult: any[]) {
  try {
    const contactEngagement = new Map<string, { opens: number; replies: number; sent: number }>();
    
    messages.forEach(msg => {
      if (!msg.contactId) return;
      
      if (!contactEngagement.has(msg.contactId)) {
        contactEngagement.set(msg.contactId, { opens: 0, replies: 0, sent: 0 });
      }
      
      const stats = contactEngagement.get(msg.contactId)!;
      stats.sent++;
      if (msg.status === 'opened' || msg.status === 'replied') stats.opens++;
      if (msg.status === 'replied') stats.replies++;
    });
    
    const segments = { high: [] as string[], medium: [] as string[], low: [] as string[] };
    
    contactEngagement.forEach((stats, contactId) => {
      const engagementScore = (stats.opens * 1 + stats.replies * 3) / stats.sent;
      
      if (engagementScore >= 2) {
        segments.high.push(contactId);
      } else if (engagementScore >= 1) {
        segments.medium.push(contactId);
      } else {
        segments.low.push(contactId);
      }
    });
    
    const summary = {
      highEngagement: segments.high.length,
      mediumEngagement: segments.medium.length,
      lowEngagement: segments.low.length,
      total: contactEngagement.size,
    };
    
    return { segments, summary };
  } catch (error) {
    logger.error('Error segmenting contacts', error as Error);
    return { segments: { high: [], medium: [], low: [] }, summary: {} };
  }
}

/**
 * Calculate optimal send times based on historical performance
 */
async function calculateOptimalSendTimes(messages: any[]) {
  try {
    const timeSlots = new Map<string, { sent: number; opened: number; replied: number }>();
    
    messages.forEach(msg => {
      if (!msg.createdAt) return;
      
      const date = new Date(msg.createdAt);
      const dayOfWeek = date.getDay(); // 0-6
      const hour = date.getHours();
      const timeSlot = `${dayOfWeek}-${hour}`;
      
      if (!timeSlots.has(timeSlot)) {
        timeSlots.set(timeSlot, { sent: 0, opened: 0, replied: 0 });
      }
      
      const stats = timeSlots.get(timeSlot)!;
      stats.sent++;
      if (msg.status === 'opened' || msg.status === 'replied') stats.opened++;
      if (msg.status === 'replied') stats.replied++;
    });
    
    const optimalTimes = Array.from(timeSlots.entries())
      .filter(([_, stats]) => stats.sent >= 5) // Minimum sample size
      .map(([timeSlot, stats]) => {
        const [day, hour] = timeSlot.split('-').map(Number);
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        
        return {
          day: dayNames[day],
          hour,
          replyRate: stats.sent > 0 ? (stats.replied / stats.sent) * 100 : 0,
          openRate: stats.sent > 0 ? (stats.opened / stats.sent) * 100 : 0,
          sampleSize: stats.sent,
        };
      })
      .sort((a, b) => b.replyRate - a.replyRate)
      .slice(0, 10);
    
    return optimalTimes;
  } catch (error) {
    logger.error('Error calculating optimal send times', error as Error);
    return [];
  }
}

/**
 * Compare template performance
 */
async function compareTemplates(messages: any[], templates: any[]) {
  try {
    const templatePerformance = new Map<string, { sent: number; opened: number; replied: number; name: string }>();
    
    messages.forEach(msg => {
      if (!msg.templateId) return;
      
      if (!templatePerformance.has(msg.templateId)) {
        const template = templates.find((t: any) => t.id === msg.templateId);
        templatePerformance.set(msg.templateId, {
          sent: 0,
          opened: 0,
          replied: 0,
          name: template?.name || 'Unknown Template',
        });
      }
      
      const stats = templatePerformance.get(msg.templateId)!;
      stats.sent++;
      if (msg.status === 'opened' || msg.status === 'replied') stats.opened++;
      if (msg.status === 'replied') stats.replied++;
    });
    
    const comparison = Array.from(templatePerformance.entries())
      .map(([templateId, stats]) => ({
        templateId,
        templateName: stats.name,
        sent: stats.sent,
        opened: stats.opened,
        replied: stats.replied,
        openRate: stats.sent > 0 ? (stats.opened / stats.sent) * 100 : 0,
        replyRate: stats.sent > 0 ? (stats.replied / stats.sent) * 100 : 0,
      }))
      .sort((a, b) => b.replyRate - a.replyRate);
    
    return comparison;
  } catch (error) {
    logger.error('Error comparing templates', error as Error);
    return [];
  }
}

/**
 * GET /api/cold-outreach/analytics
 * Retrieves comprehensive analytics data for cold outreach campaigns
 * @param request - Next.js request object with query parameters
 * @returns Promise<NextResponse> - JSON response with analytics data and metadata
 */
export const GET = withPerformanceMonitoring(
  async (request: NextRequest): Promise<NextResponse> => {
    const startTime = Date.now();
    let userId: string = '';

    try {
      // Authentication
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        logger.warn('Unauthorized access attempt to analytics API', {
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

      if (!userId) {
        return NextResponse.json(
          { error: 'Invalid session', code: 'INVALID_SESSION' },
          { status: 401 }
        );
      }

      // Rate limiting with detailed logging
      const rateLimitResult = coldOutreachRateLimit.check(session.user.id, request);
      if (!rateLimitResult.allowed) {
        logger.warn('Rate limit exceeded for analytics read', {
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
      const queryValidation = analyticsQuerySchema.safeParse({
        timeRange: searchParams.get('timeRange') ?? undefined,
        startDate: searchParams.get('startDate') ?? undefined,
        endDate: searchParams.get('endDate') ?? undefined,
        campaignId: searchParams.get('campaignId') ?? undefined,
        includeAdvanced: searchParams.get('includeAdvanced') ?? searchParams.get('advanced') ?? undefined,
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

      const {
        timeRange,
        startDate: startDateParam,
        endDate: endDateParam,
        campaignId,
        includeAdvanced,
      } = queryValidation.data;

      const endDate = endDateParam ? new Date(endDateParam) : new Date();
      const startDate = startDateParam ? new Date(startDateParam) : new Date(endDate);

      if (!startDateParam) {
        const range = timeRange ?? '30d';
        switch (range) {
          case '7d':
            startDate.setDate(endDate.getDate() - 7);
            break;
          case '90d':
            startDate.setDate(endDate.getDate() - 90);
            break;
          default:
            startDate.setDate(endDate.getDate() - 30);
        }
      }

      // Normalize to inclusive day boundaries when explicit dates are provided
      if (startDateParam) {
        startDate.setHours(0, 0, 0, 0);
      }
      if (endDateParam) {
        endDate.setHours(23, 59, 59, 999);
      }

      if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
        return NextResponse.json(
          {
            error: 'Invalid date range provided',
            code: 'INVALID_DATE_RANGE',
          },
          { status: 400 }
        );
      }

      if (startDate > endDate) {
        return NextResponse.json(
          {
            error: 'Start date must be before end date',
            code: 'INVALID_DATE_RANGE',
          },
          { status: 400 }
        );
      }

      const startDateIso = startDate.toISOString();
      const endDateIso = endDate.toISOString();
      const resolvedTimeRange = startDateParam || endDateParam ? 'custom' : (timeRange ?? '30d');

      logger.info('Fetching analytics data', {
        userId,
        timeRange: resolvedTimeRange,
        includeAdvanced,
        campaignId,
        dateRange: {
          start: startDateIso,
          end: endDateIso,
        },
        timestamp: new Date().toISOString(),
      });

      const db = getDb();

      const campaignConditions = [
        eq(Campaigns.userId, userId),
        gte(Campaigns.createdAt, startDateIso),
        lte(Campaigns.createdAt, endDateIso),
      ];
      if (campaignId) {
        campaignConditions.push(eq(Campaigns.id, campaignId));
      }

      const messageConditions = [
        eq(Messages.userId, userId),
        gte(Messages.createdAt, startDateIso),
        lte(Messages.createdAt, endDateIso),
      ];
      if (campaignId) {
        messageConditions.push(eq(Messages.campaignId, campaignId));
      }

      // Fetch all required data with retry logic and parallel execution
      const [
        campaigns,
        contactsResult,
        messages,
        templates,
      ] = await Promise.all([
        retryWithBackoff(
          () => db.select().from(Campaigns).where(
            and(...campaignConditions)
          ).orderBy(desc(Campaigns.createdAt)),
          3,
          1000
        ),
        retryWithBackoff(
          () => db.select({ count: sql<number>`count(*)` }).from(Contacts).where(
            eq(Contacts.userId, userId)
          ),
          3,
          1000
        ),
        retryWithBackoff(
          () => db.select().from(Messages).where(
            and(...messageConditions)
          ),
          3,
          1000
        ),
        retryWithBackoff(
          () => db.select().from(Templates).where(
            eq(Templates.userId, userId)
          ),
          3,
          1000
        ),
      ]);

      const totalContacts = contactsResult[0]?.count || 0;

      // Calculate basic metrics
      const activeCampaigns = campaigns.filter(c => c.status === 'active').length;
      const totalCampaigns = campaigns.length;

      const sentMessages = messages.filter(m => m.status === 'sent').length;
      const openedMessages = messages.filter(m => m.status === 'opened').length;
      const repliedMessages = messages.filter(m => m.status === 'replied').length;
      const bouncedMessages = messages.filter(m => m.status === 'bounced').length;

      const openRate = sentMessages > 0 ? Math.round((openedMessages / sentMessages) * 100) : 0;
      const replyRate = sentMessages > 0 ? Math.round((repliedMessages / sentMessages) * 100) : 0;
      const bounceRate = sentMessages > 0 ? Math.round((bouncedMessages / sentMessages) * 100) : 0;

      // Campaign performance data
      const campaignPerformance = campaigns.map(campaign => {
        const campaignMessages = messages.filter(m => m.campaignId === campaign.id);
        const sent = campaignMessages.filter(m => m.status === 'sent').length;
        const opened = campaignMessages.filter(m => m.status === 'opened').length;
        const replied = campaignMessages.filter(m => m.status === 'replied').length;

        return {
          id: campaign.id,
          name: campaign.name,
          status: campaign.status,
          sentCount: sent,
          openedCount: opened,
          repliedCount: replied,
          openRate: sent > 0 ? Math.round((opened / sent) * 100) : 0,
          replyRate: sent > 0 ? Math.round((replied / sent) * 100) : 0,
          createdAt: campaign.createdAt,
        };
      });

      // Time series data for charts
      const timeSeriesData = [];
      const msPerDay = 1000 * 60 * 60 * 24;
      const startDayIndex = Math.floor(startDate.getTime() / msPerDay);
      const endDayIndex = Math.floor(endDate.getTime() / msPerDay);
      const customSpan = Math.max(1, endDayIndex - startDayIndex + 1);
      const daySpan = resolvedTimeRange === 'custom'
        ? customSpan
        : resolvedTimeRange === '7d'
          ? 7
          : resolvedTimeRange === '30d'
            ? 30
            : 90;

      for (let i = daySpan - 1; i >= 0; i--) {
        const date = new Date(endDate);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        const dayMessages = messages.filter(m => {
          const messageDate = new Date(m.createdAt!).toISOString().split('T')[0];
          return messageDate === dateStr;
        });

        const sent = dayMessages.filter(m => m.status === 'sent').length;
        const opened = dayMessages.filter(m => m.status === 'opened').length;
        const replied = dayMessages.filter(m => m.status === 'replied').length;

        timeSeriesData.push({
          date: dateStr,
          sent,
          opened,
          replied,
        });
      }

      // Template usage analytics
      const templateUsage = templates.map(template => ({
        id: template.id,
        name: template.name,
        category: template.category,
        usageCount: messages.filter(m => {
          // This would need to be tracked in messages table
          // For now, return 0
          return false;
        }).length,
      }));

      const analytics: any = {
        overview: {
          activeCampaigns,
          totalCampaigns,
          totalContacts,
          sentMessages,
          openedMessages,
          repliedMessages,
          bouncedMessages,
          openRate,
          replyRate,
          bounceRate,
        },
        campaignPerformance,
        timeSeriesData,
        templateUsage,
        timeRange: resolvedTimeRange,
        dateRange: {
          start: startDateIso,
          end: endDateIso,
        },
        campaignFilter: campaignId,
      };

      // Add advanced analytics if requested
      if (includeAdvanced) {
        analytics.advanced = await generateAdvancedAnalytics(db, userId, messages, campaigns, templates, resolvedTimeRange);
      }

      const responseTime = Date.now() - startTime;

      logger.info('Analytics data retrieved successfully', {
        userId,
        responseTime,
        dataPoints: {
          campaigns: campaigns.length,
          messages: messages.length,
          templates: templates.length,
          contacts: totalContacts,
        },
        includeAdvanced,
        timeRange: resolvedTimeRange,
        timestamp: new Date().toISOString(),
      });

      // Audit log the analytics access
      await auditAnalyticsOperation('read', userId, {
        timeRange: resolvedTimeRange,
        includeAdvanced,
        dataPoints: Object.keys(analytics.overview).length,
        responseTime,
        campaignId: campaignId ?? null,
        dateRange: {
          start: startDateIso,
          end: endDateIso,
        },
      });

      return NextResponse.json({
        analytics,
        metadata: {
          responseTime,
          timestamp: new Date().toISOString(),
          apiVersion: 'v1',
          dataFreshness: 'real-time',
        },
      });

    } catch (error) {
      const responseTime = Date.now() - startTime;

      logger.error('Error fetching analytics data', error instanceof Error ? error : new Error('Unknown error'), {
        userId,
        responseTime,
        timestamp: new Date().toISOString(),
      });

      if (error instanceof ValidationError) {
        return NextResponse.json(
          {
            error: error.message,
            code: 'VALIDATION_ERROR',
            details: (error as any).details || {},
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
  'analytics.get'
);

async function generateAdvancedAnalytics(db: any, userId: string, messages: any[], campaigns: any[], templates: any[], timeRange: string) {
  try {
    logger.info('Generating advanced analytics', {
      userId,
      timeRange,
      dataPoints: {
        messages: messages.length,
        campaigns: campaigns.length,
        templates: templates.length,
      },
      timestamp: new Date().toISOString(),
    });

    // Execute advanced analytics functions with error handling
    const [
      abTestingResults,
      performanceInsights,
      predictiveAnalytics,
      contactSegmentation,
      optimalSendTimes,
      templateComparison,
    ] = await Promise.all([
      performABTesting(messages, templates).catch(error => {
        logger.warn('Error in A/B testing analysis', { userId, error: error.message });
        return [];
      }),
      generatePerformanceInsights(messages).catch(() => ({ bestDaysOfWeek: [], bestSendHours: [], recommendations: [] })),
      generatePredictiveAnalytics(messages, campaigns).catch(() => ({ currentPerformance: {}, predictedPerformance: {}, recommendations: [] })),
      segmentContacts(messages, []).catch(() => ({ segments: { high: [], medium: [], low: [] }, summary: {} })),
      calculateOptimalSendTimes(messages).catch(() => []),
      compareTemplates(messages, templates).catch(() => []),
    ]);

    const advancedAnalytics = {
      abTesting: abTestingResults,
      performanceInsights,
      predictiveAnalytics,
      contactSegmentation,
      optimalSendTimes,
      templateComparison,
    };

    logger.info('Advanced analytics generated successfully', {
      userId,
      analyticsCount: Object.keys(advancedAnalytics).length,
      timestamp: new Date().toISOString(),
    });

    return advancedAnalytics;

  } catch (error) {
    logger.error('Error generating advanced analytics', error instanceof Error ? error : new Error('Unknown error'), {
      userId,
      timestamp: new Date().toISOString(),
    });
    // Return empty advanced analytics on error to prevent breaking the main response
    return {
      abTesting: [],
      performanceInsights: { bestDaysOfWeek: [], bestSendHours: [], recommendations: [] },
      predictiveAnalytics: { currentPerformance: {}, predictedPerformance: {}, recommendations: [] },
      contactSegmentation: { segments: { high: [], medium: [], low: [] }, summary: {} },
      optimalSendTimes: [],
      templateComparison: [],
    };
  }
}

async function performABTesting(messages: any[], templates: any[]) {
  try {
    // Group messages by template variations
    const templateGroups = new Map<string, any[]>();

    messages.forEach(message => {
      // For A/B testing, we assume templates with similar names are variations
      const baseName = message.subject?.split(' ')[0] || 'Unknown';
      if (!templateGroups.has(baseName)) {
        templateGroups.set(baseName, []);
      }
      templateGroups.get(baseName)!.push(message);
    });

    const abResults = [];
    for (const [templateName, msgs] of templateGroups) {
      if (msgs.length < 10) continue; // Need minimum sample size

      const sent = msgs.filter((m: any) => m.status === 'sent').length;
      const opened = msgs.filter((m: any) => m.status === 'opened').length;
      const replied = msgs.filter((m: any) => m.status === 'replied').length;

      if (sent === 0) continue; // Skip if no sent messages

      const openRate = (opened / sent) * 100;
      const replyRate = (replied / sent) * 100;

      abResults.push({
        templateName,
        sampleSize: msgs.length,
        sent,
        opened,
        replied,
        openRate: Math.round(openRate * 100) / 100,
        replyRate: Math.round(replyRate * 100) / 100,
        confidence: calculateConfidenceInterval(openRate / 100, sent),
      });
    }

    return abResults.sort((a, b) => b.openRate - a.openRate);

  } catch (error) {
    logger.error('Error performing A/B testing analysis', error instanceof Error ? error : new Error('Unknown error'), {
      messageCount: messages.length,
      templateCount: templates.length,
    });
    return [];
  }
}

// Helper function for confidence interval calculation
function calculateConfidenceInterval(rate: number, sampleSize: number) {
  try {
    if (sampleSize <= 0) return 0;
    const standardError = Math.sqrt((rate * (1 - rate)) / sampleSize);
    const confidenceInterval = 1.96 * standardError; // 95% confidence
    return Math.round(confidenceInterval * 10000) / 100; // Return as percentage
  } catch (error) {
    return 0;
  }
}
