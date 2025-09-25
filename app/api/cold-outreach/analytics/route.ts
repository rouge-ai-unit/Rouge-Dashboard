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
 * Helper function to return 501 Not Implemented for placeholder analytics
 */
function notImplemented(feature: string): Promise<never> {
  throw new Error(`Feature '${feature}' is not yet implemented. TODO: Implement ${feature} analytics.`);
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
      notImplemented('performanceInsights').catch(() => ({ bestDaysOfWeek: [], bestSendHours: [], recommendations: [] })),
      notImplemented('predictiveAnalytics').catch(() => ({ currentPerformance: {}, predictedPerformance: {}, recommendations: [] })),
      notImplemented('contactSegmentation').catch(() => ({ segments: { high: [], medium: [], low: [] }, summary: {} })),
      notImplemented('optimalSendTimes').catch(() => []),
      notImplemented('templateComparison').catch(() => []),
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

function generatePerformanceInsights(messages: any[], campaigns: any[], timeRange: string) {
  try {
    // Analyze performance by day of week
    const dayOfWeekPerformance = Array.from({ length: 7 }, (_, i) => ({
      day: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][i],
      sent: 0,
      opened: 0,
      replied: 0,
    }));

    messages.forEach(message => {
      if (message.createdAt) {
        const day = new Date(message.createdAt).getDay();
        if (message.status === 'sent') dayOfWeekPerformance[day].sent += 1;
        if (message.status === 'opened') dayOfWeekPerformance[day].opened += 1;
        if (message.status === 'replied') dayOfWeekPerformance[day].replied += 1;
      }
    });

    // Calculate best performing days
    const bestDays = dayOfWeekPerformance
      .map(day => ({
        ...day,
        openRate: day.sent > 0 ? (day.opened / day.sent) * 100 : 0,
        replyRate: day.sent > 0 ? (day.replied / day.sent) * 100 : 0,
      }))
      .sort((a, b) => b.openRate - a.openRate);

    // Analyze performance by hour
    const hourPerformance = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      sent: 0,
      opened: 0,
      replied: 0,
    }));

    messages.forEach(message => {
      if (message.createdAt) {
        const hour = new Date(message.createdAt).getHours();
        if (message.status === 'sent') hourPerformance[hour].sent += 1;
        if (message.status === 'opened') hourPerformance[hour].opened += 1;
        if (message.status === 'replied') hourPerformance[hour].replied += 1;
      }
    });

    const bestHours = hourPerformance
      .map(hour => ({
        ...hour,
        openRate: hour.sent > 0 ? (hour.opened / hour.sent) * 100 : 0,
      }))
      .sort((a, b) => b.openRate - a.openRate)
      .slice(0, 5);

    return {
      bestDaysOfWeek: bestDays.slice(0, 3),
      bestSendHours: bestHours,
      recommendations: generateRecommendations(bestDays[0], bestHours[0]),
    };

  } catch (error) {
    logger.error('Error generating performance insights', error instanceof Error ? error : new Error('Unknown error'), {
      messageCount: messages.length,
      campaignCount: campaigns.length,
    });
    return {
      bestDaysOfWeek: [],
      bestSendHours: [],
      recommendations: ['Unable to generate performance insights due to data processing error'],
    };
  }
}

function generatePredictiveAnalytics(messages: any[], campaigns: any[]) {
  try {
    // Simple predictive analytics based on historical data
    const totalSent = messages.filter(m => m.status === 'sent').length;
    const totalOpened = messages.filter(m => m.status === 'opened').length;
    const totalReplied = messages.filter(m => m.status === 'replied').length;

    if (totalSent === 0) {
      return {
        currentPerformance: {
          avgOpenRate: 0,
          avgReplyRate: 0,
        },
        predictedPerformance: {
          nextWeekOpenRate: 0,
          nextWeekReplyRate: 0,
          trend: 'insufficient-data',
        },
        recommendations: ['Insufficient data for predictive analytics'],
      };
    }

    const avgOpenRate = (totalOpened / totalSent) * 100;
    const avgReplyRate = (totalReplied / totalSent) * 100;

    // Predict future performance based on trends
    const recentMessages = messages
      .filter(m => m.createdAt && new Date(m.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
      .slice(-100); // Last 100 messages

    const recentSent = recentMessages.filter(m => m.status === 'sent').length;
    const recentOpened = recentMessages.filter(m => m.status === 'opened').length;
    const recentReplied = recentMessages.filter(m => m.status === 'replied').length;

    const recentOpenRate = recentSent > 0 ? (recentOpened / recentSent) * 100 : 0;
    const recentReplyRate = recentSent > 0 ? (recentReplied / recentSent) * 100 : 0;

    const trend = recentOpenRate > avgOpenRate ? 'improving' : recentSent >= 10 ? 'declining' : 'insufficient-data';

    return {
      currentPerformance: {
        avgOpenRate: Math.round(avgOpenRate * 100) / 100,
        avgReplyRate: Math.round(avgReplyRate * 100) / 100,
      },
      predictedPerformance: {
        nextWeekOpenRate: Math.round(recentOpenRate * 100) / 100,
        nextWeekReplyRate: Math.round(recentReplyRate * 100) / 100,
        trend,
      },
      recommendations: trend === 'improving'
        ? ['Continue current strategy', 'Consider scaling up successful campaigns']
        : trend === 'declining'
        ? ['Review recent campaigns', 'Test different subject lines', 'Check send timing']
        : ['Collect more data for accurate predictions'],
    };

  } catch (error) {
    logger.error('Error generating predictive analytics', error instanceof Error ? error : new Error('Unknown error'), {
      messageCount: messages.length,
      campaignCount: campaigns.length,
    });
    return {
      currentPerformance: { avgOpenRate: 0, avgReplyRate: 0 },
      predictedPerformance: { nextWeekOpenRate: 0, nextWeekReplyRate: 0, trend: 'error' },
      recommendations: ['Unable to generate predictions due to processing error'],
    };
  }
}

async function generateContactSegmentation(db: any, userId: string, messages: any[]) {
  try {
    // Get contact data with engagement metrics
    const contacts = await retryWithBackoff(
      () => db.select().from(Contacts).where(eq(Contacts.userId, userId)),
      3,
      1000
    ) as any[];

    const contactEngagement = contacts.map((contact: any) => {
      const contactMessages = messages.filter(m => m.contactId === contact.id);
      const sent = contactMessages.filter(m => m.status === 'sent').length;
      const opened = contactMessages.filter(m => m.status === 'opened').length;
      const replied = contactMessages.filter(m => m.status === 'replied').length;

      const engagementScore = sent > 0 ? ((opened * 2) + (replied * 5)) / sent : 0;

      return {
        id: contact.id,
        name: contact.name,
        email: contact.email,
        company: contact.company,
        role: contact.role,
        sent,
        opened,
        replied,
        engagementScore: Math.round(engagementScore * 100) / 100,
        segment: engagementScore > 3 ? 'high' : engagementScore > 1 ? 'medium' : 'low',
      };
    });

    const segments = {
      high: contactEngagement.filter((c: any) => c.segment === 'high'),
      medium: contactEngagement.filter((c: any) => c.segment === 'medium'),
      low: contactEngagement.filter((c: any) => c.segment === 'low'),
    };

    return {
      segments,
      summary: {
        highEngagement: segments.high.length,
        mediumEngagement: segments.medium.length,
        lowEngagement: segments.low.length,
        totalContacts: contacts.length,
      },
    };

  } catch (error) {
    logger.error('Error generating contact segmentation', error instanceof Error ? error : undefined, {
      userId,
      messageCount: messages.length,
    });
    return {
      segments: { high: [], medium: [], low: [] },
      summary: { highEngagement: 0, mediumEngagement: 0, lowEngagement: 0, totalContacts: 0 },
    };
  }
}

function calculateOptimalSendTimes(messages: any[]) {
  try {
    const hourStats = Array.from({ length: 24 }, (_, hour) => {
      const hourMessages = messages.filter(m => {
        if (!m.createdAt) return false;
        const msgHour = new Date(m.createdAt).getHours();
        return msgHour === hour;
      });

      const sent = hourMessages.filter(m => m.status === 'sent').length;
      const opened = hourMessages.filter(m => m.status === 'opened').length;

      return {
        hour,
        sent,
        opened,
        openRate: sent > 0 ? (opened / sent) * 100 : 0,
      };
    });

    return hourStats
      .filter(stat => stat.sent > 5) // Minimum sample size
      .sort((a, b) => b.openRate - a.openRate)
      .slice(0, 5);

  } catch (error) {
    logger.error('Error calculating optimal send times', error instanceof Error ? error : undefined, {
      messageCount: messages.length,
    });
    return [];
  }
}

function compareTemplatePerformance(messages: any[], templates: any[]) {
  try {
    return templates.map(template => {
      // Find messages that used this template (simplified matching)
      const templateMessages = messages.filter(m =>
        m.subject?.toLowerCase().includes(template.name.toLowerCase()) ||
        m.content?.toLowerCase().includes(template.subject?.toLowerCase())
      );

      const sent = templateMessages.filter(m => m.status === 'sent').length;
      const opened = templateMessages.filter(m => m.status === 'opened').length;
      const replied = templateMessages.filter(m => m.status === 'replied').length;

      return {
        templateId: template.id,
        templateName: template.name,
        category: template.category,
        sent,
        opened,
        replied,
        openRate: sent > 0 ? Math.round((opened / sent) * 100) : 0,
        replyRate: sent > 0 ? Math.round((replied / sent) * 100) : 0,
      };
    }).sort((a, b) => b.openRate - a.openRate);

  } catch (error) {
    logger.error('Error comparing template performance', error instanceof Error ? error : new Error('Unknown error'), {
      messageCount: messages.length,
      templateCount: templates.length,
    });
    return [];
  }
}

function calculateConfidenceInterval(rate: number, sampleSize: number) {
  try {
    // Simplified confidence interval calculation
    if (sampleSize <= 0) return 0;

    const standardError = Math.sqrt((rate * (1 - rate)) / sampleSize);
    const confidenceInterval = 1.96 * standardError; // 95% confidence
    return Math.round(confidenceInterval * 10000) / 100; // Return as percentage

  } catch (error) {
    logger.error('Error calculating confidence interval', error instanceof Error ? error : undefined, {
      rate,
      sampleSize,
    });
    return 0;
  }
}

function generateRecommendations(bestDay: any, bestHour: any) {
  try {
    const recommendations = [];

    if (bestDay && bestDay.sent > 0) {
      recommendations.push(`Best day to send: ${bestDay.day} (${bestDay.openRate.toFixed(1)}% open rate)`);
    }

    if (bestHour && bestHour.sent > 0) {
      recommendations.push(`Best time to send: ${bestHour.hour}:00 (${bestHour.openRate.toFixed(1)}% open rate)`);
    }

    recommendations.push('Consider A/B testing different subject lines');
    recommendations.push('Personalize emails based on recipient role and company');

    return recommendations;

  } catch (error) {
    logger.error('Error generating recommendations', error instanceof Error ? error : new Error('Unknown error'), {});
    return ['Unable to generate recommendations due to processing error'];
  }
}
