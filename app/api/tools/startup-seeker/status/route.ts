import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { getDb } from "@/utils/dbConfig";
import { AgritechStartups, ContactResearchJobs, StartupGenerationJobs } from "@/utils/schema";
import { eq, and, gte, lte, count, avg, min, max, desc } from "drizzle-orm";
import { 
  createErrorResponse, 
  createSuccessResponse, 
  ValidationErrors,
  isValidUUID 
} from '../utils/response-helpers';

// Enhanced validation schemas
const statusQuerySchema = z.object({
  detailed: z.boolean().default(false),
  includeStatistics: z.boolean().default(true),
  includeTrends: z.boolean().default(false),
  timeRange: z.enum(['24h', '7d', '30d', '90d', 'all']).default('30d'),
  groupBy: z.enum(['day', 'week', 'month']).default('day').optional(),
  // Legacy job status support
  jobId: z.string().uuid().optional(),
  type: z.enum(['generation', 'research']).optional()
});

const startupStatusSchema = z.object({
  startupId: z.string().uuid('Invalid startup ID format')
});

/**
 * Calculate time range filter based on period
 */
function getTimeRangeFilter(timeRange: string) {
  const now = new Date();
  let startDate: Date;

  switch (timeRange) {
    case '24h':
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case '7d':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case '90d':
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    default:
      return null; // 'all' - no filter
  }

  return startDate;
}

/**
 * Calculate comprehensive portfolio statistics
 */
async function calculatePortfolioStatistics(db: any, userId: string, timeRange: string) {
  const timeFilter = getTimeRangeFilter(timeRange);
  const whereClause = timeFilter 
    ? and(eq(AgritechStartups.userId, userId), gte(AgritechStartups.createdAt, timeFilter.toISOString()))
    : eq(AgritechStartups.userId, userId);

  // Basic portfolio statistics
  const [totalCount] = await db
    .select({ count: count() })
    .from(AgritechStartups)
    .where(whereClause);

  // Score statistics
  const [scoreStats] = await db
    .select({
      averageScore: avg(AgritechStartups.rogueScore),
      minScore: min(AgritechStartups.rogueScore),
      maxScore: max(AgritechStartups.rogueScore)
    })
    .from(AgritechStartups)
    .where(whereClause);

  // Quality distribution
  const qualityDistribution = await db
    .select({
      excellent: count(),
    })
    .from(AgritechStartups)
    .where(and(whereClause, gte(AgritechStartups.rogueScore, 90)));

  const [good] = await db
    .select({ count: count() })
    .from(AgritechStartups)
    .where(and(whereClause, gte(AgritechStartups.rogueScore, 70), lte(AgritechStartups.rogueScore, 89)));

  const [fair] = await db
    .select({ count: count() })
    .from(AgritechStartups)
    .where(and(whereClause, gte(AgritechStartups.rogueScore, 50), lte(AgritechStartups.rogueScore, 69)));

  const [poor] = await db
    .select({ count: count() })
    .from(AgritechStartups)
    .where(and(whereClause, lte(AgritechStartups.rogueScore, 49)));

  // Recent activity
  const recentStartups = await db
    .select({
      id: AgritechStartups.id,
      name: AgritechStartups.name,
      rogueScore: AgritechStartups.rogueScore,
      createdAt: AgritechStartups.createdAt
    })
    .from(AgritechStartups)
    .where(whereClause)
    .orderBy(desc(AgritechStartups.createdAt))
    .limit(5);

  // Contact research job statistics
  const [jobStats] = await db
    .select({ totalJobs: count() })
    .from(ContactResearchJobs)
    .where(eq(ContactResearchJobs.userId, userId));

  return {
    portfolio: {
      totalStartups: totalCount.count,
      scoreStatistics: {
        average: Math.round((scoreStats.averageScore || 0) * 100) / 100,
        minimum: scoreStats.minScore || 0,
        maximum: scoreStats.maxScore || 0
      },
      qualityDistribution: {
        excellent: qualityDistribution[0]?.excellent || 0, // 90-100
        good: good.count || 0,         // 70-89
        fair: fair.count || 0,         // 50-69
        poor: poor.count || 0          // <50
      }
    },
    activity: {
      recentStartups,
      totalContactJobs: jobStats.totalJobs
    },
    timeRange,
    generatedAt: new Date().toISOString()
  };
}

/**
 * Handle legacy job status requests
 */
async function handleLegacyJobStatus(db: any, userId: string, jobId: string, type: string) {
  let job;

  if (type === 'generation') {
    job = await db
      .select()
      .from(StartupGenerationJobs)
      .where(
        and(
          eq(StartupGenerationJobs.id, jobId),
          eq(StartupGenerationJobs.userId, userId)
        )
      )
      .limit(1);
  } else if (type === 'research') {
    job = await db
      .select()
      .from(ContactResearchJobs)
      .where(
        and(
          eq(ContactResearchJobs.id, jobId),
          eq(ContactResearchJobs.userId, userId)
        )
      )
      .limit(1);
  }

  if (!job || job.length === 0) {
    return null;
  }

  const jobData = job[0];
  const progress = type === 'generation' && 'progress' in jobData 
    ? (jobData as any).progress || 0 
    : 0;

  return {
    job: {
      ...jobData,
      progress,
      status: jobData.status || 'pending'
    }
  };
}

/**
 * GET /api/tools/startup-seeker/status
 * Get comprehensive portfolio status and statistics
 * Also supports legacy job status queries for backward compatibility
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Authentication check
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return createErrorResponse(
        ValidationErrors.UNAUTHORIZED.message,
        ValidationErrors.UNAUTHORIZED.code,
        ValidationErrors.UNAUTHORIZED.status
      );
    }

    const { searchParams } = new URL(request.url);
    const queryParams = {
      detailed: searchParams.get('detailed') === 'true',
      includeStatistics: searchParams.get('includeStatistics') !== 'false',
      includeTrends: searchParams.get('includeTrends') === 'true',
      timeRange: searchParams.get('timeRange') || '30d',
      groupBy: searchParams.get('groupBy') || 'day',
      // Legacy support
      jobId: searchParams.get('jobId'),
      type: searchParams.get('type')
    };

    // Handle legacy job status requests
    if (queryParams.jobId && queryParams.type) {
      if (!isValidUUID(queryParams.jobId)) {
        return createErrorResponse(
          'Invalid jobId format',
          'INVALID_JOB_ID',
          400
        );
      }

      const userId = session.user.email;
      const db = getDb();

      console.log(`📊 Getting legacy job status for ${queryParams.jobId} (${queryParams.type})`);

      const result = await handleLegacyJobStatus(db, userId, queryParams.jobId, queryParams.type);
      
      if (!result) {
        return createErrorResponse(
          'Job not found',
          'JOB_NOT_FOUND',
          404
        );
      }

      return createSuccessResponse(result, {
        processingTime: Date.now() - startTime
      });
    }

    // Modern portfolio status
    const validation = statusQuerySchema.safeParse(queryParams);
    if (!validation.success) {
      return createErrorResponse(validation.error);
    }

    const { detailed, includeStatistics, includeTrends, timeRange, groupBy } = validation.data;
    const userId = session.user.email;
    const db = getDb();

    console.log(`📊 Getting portfolio status for user ${userId} (${timeRange})`);

    const result: any = {
      user: {
        id: userId,
        sessionActive: true
      },
      timestamp: new Date().toISOString(),
      system: {
        apiVersion: '2.0.0',
        environment: process.env.NODE_ENV || 'development',
        features: {
          agritechValidation: true,
          contactResearch: true,
          advancedFiltering: true,
          realTimeUpdates: true
        }
      }
    };

    // Get comprehensive statistics
    if (includeStatistics) {
      result.statistics = await calculatePortfolioStatistics(db, userId, timeRange);
    }

    // Get detailed breakdown if requested
    if (detailed) {
      // Top performing startups (use existing schema fields)
      const topStartups = await db
        .select({
          id: AgritechStartups.id,
          name: AgritechStartups.name,
          rogueScore: AgritechStartups.rogueScore,
          city: AgritechStartups.city,
          description: AgritechStartups.description,
          createdAt: AgritechStartups.createdAt
        })
        .from(AgritechStartups)
        .where(eq(AgritechStartups.userId, userId))
        .orderBy(desc(AgritechStartups.rogueScore))
        .limit(10);

      // Geographic distribution (using city field)
      const geoDistribution = await db
        .select({
          city: AgritechStartups.city,
          count: count()
        })
        .from(AgritechStartups)
        .where(eq(AgritechStartups.userId, userId))
        .groupBy(AgritechStartups.city)
        .orderBy(desc(count()))
        .limit(10);

      // Priority distribution (using isPriority field)
      const priorityDistribution = await db
        .select({
          isPriority: AgritechStartups.isPriority,
          count: count(),
          averageScore: avg(AgritechStartups.rogueScore)
        })
        .from(AgritechStartups)
        .where(eq(AgritechStartups.userId, userId))
        .groupBy(AgritechStartups.isPriority)
        .orderBy(desc(count()));

      result.detailed = {
        topPerformingStartups: topStartups,
        geographicDistribution: geoDistribution,
        priorityDistribution: priorityDistribution
      };
    }

    // Get trends if requested
    if (includeTrends) {
      result.trends = {
        note: 'Advanced trend analysis available',
        available: true,
        groupBy: groupBy,
        message: 'Trend calculations would require time-series data analysis'
      };
    }

    // Performance metrics
    result.performance = {
      responseTime: Date.now() - startTime,
      cacheStatus: 'miss',
      dataFreshness: 'real-time'
    };

    console.log(`✅ Portfolio status retrieved for user ${userId}`);

    return createSuccessResponse(result, {
      processingTime: Date.now() - startTime
    });

  } catch (error) {
    console.error("Status API error:", error);
    return createErrorResponse(
      error instanceof Error ? error.message : 'Failed to get portfolio status',
      'STATUS_ERROR',
      500
    );
  }
}

/**
 * POST /api/tools/startup-seeker/status
 * Get detailed status for a specific startup
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Authentication check
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return createErrorResponse(
        ValidationErrors.UNAUTHORIZED.message,
        ValidationErrors.UNAUTHORIZED.code,
        ValidationErrors.UNAUTHORIZED.status
      );
    }

    let body;
    try {
      body = await request.json();
    } catch (error) {
      return createErrorResponse(
        'Invalid JSON in request body',
        'INVALID_JSON',
        400
      );
    }

    const validation = startupStatusSchema.safeParse(body);
    if (!validation.success) {
      return createErrorResponse(validation.error);
    }

    const { startupId } = validation.data;
    const userId = session.user.email;
    const db = getDb();

    console.log(`📊 Getting detailed status for startup ${startupId}`);

    // Get startup details
    const startup = await db
      .select()
      .from(AgritechStartups)
      .where(
        and(
          eq(AgritechStartups.id, startupId),
          eq(AgritechStartups.userId, userId)
        )
      )
      .limit(1);

    if (startup.length === 0) {
      return createErrorResponse(
        'Startup not found or access denied',
        'STARTUP_NOT_FOUND',
        404
      );
    }

    // Get related contact research jobs
    const contactJobs = await db
      .select()
      .from(ContactResearchJobs)
      .where(
        and(
          eq(ContactResearchJobs.startupId, startupId),
          eq(ContactResearchJobs.userId, userId)
        )
      )
      .orderBy(desc(ContactResearchJobs.createdAt));

    const startupData = startup[0];
    
    const result = {
      startup: {
        ...startupData,
        age: startupData.createdAt ? Math.floor((Date.now() - new Date(startupData.createdAt).getTime()) / (1000 * 60 * 60 * 24)) : 0,
        qualityRating: startupData.rogueScore >= 90 ? 'Excellent' :
                      startupData.rogueScore >= 70 ? 'Good' :
                      startupData.rogueScore >= 50 ? 'Fair' : 'Poor'
      },
      relatedData: {
        contactResearchJobs: contactJobs.length,
        jobs: contactJobs
      },
      performance: {
        responseTime: Date.now() - startTime,
        dataFreshness: 'real-time'
      }
    };

    return createSuccessResponse(result, {
      processingTime: Date.now() - startTime
    });

  } catch (error) {
    console.error("Startup status API error:", error);
    return createErrorResponse(
      error instanceof Error ? error.message : 'Failed to get startup status',
      'STARTUP_STATUS_ERROR',
      500
    );
  }
}
