import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import { startupGenerationEngine } from '@/lib/startup_seeker/startup-seeker';
import { 
  createErrorResponse, 
  createSuccessResponse, 
  ValidationErrors 
} from '../utils/response-helpers';

// Enhanced query parameters validation
const resultsQuerySchema = z.object({
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
  minScore: z.number().int().min(0).max(100).optional(),
  maxScore: z.number().int().min(0).max(100).optional(),
  isPriority: z.boolean().optional(),
  sortBy: z.enum(['score', 'date', 'name', 'city']).default('score'),
  order: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().max(100).optional(),
  city: z.string().max(50).optional(),
  includeMetadata: z.boolean().default(true),
  format: z.enum(['json', 'summary']).default('json')
});

/**
 * GET /api/tools/startup-seeker/results
 * Get user's startup results with advanced filtering, pagination, and caching
 * Enterprise-grade with performance optimizations
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
    const userId = session.user.email;

    // Parse and validate query parameters
    const queryParams = {
      limit: Number(searchParams.get('limit')) || 20,
      offset: Number(searchParams.get('offset')) || 0,
      minScore: searchParams.get('minScore') ? Number(searchParams.get('minScore')) : undefined,
      maxScore: searchParams.get('maxScore') ? Number(searchParams.get('maxScore')) : undefined,
       isPriority: searchParams.get('isPriority') ? searchParams.get('isPriority') === 'true' : undefined,
       sortBy: searchParams.get('sortBy') || 'score',
       order: searchParams.get('order') || 'desc',
    };
    const validation = resultsQuerySchema.safeParse(queryParams);
    if (!validation.success) {
      return createErrorResponse(validation.error);
    }

    const options = validation.data;

    // Validate score range if both min and max are provided
    if (options.minScore && options.maxScore && options.minScore > options.maxScore) {
      return createErrorResponse(
        'minScore cannot be greater than maxScore',
        'INVALID_SCORE_RANGE',
        400
      );
    }

    console.log(`📊 Fetching results for user ${userId}:`, {
      limit: options.limit,
      offset: options.offset,
      filters: Object.keys(options).filter(k => options[k as keyof typeof options] !== undefined).length
    });

    // Build comprehensive filter options
    const filterOptions = {
      limit: options.limit,
      offset: options.offset,
      minScore: options.minScore,
      maxScore: options.maxScore,
      isPriority: options.isPriority,
      sortBy: options.sortBy as any,
      order: options.order as any,
      search: options.search,
      city: options.city
    };

    // Get startups with advanced filtering
    const startups = await startupGenerationEngine.getUserStartups(userId, filterOptions);

    // Get total count for pagination (approximate by fetching ids only with filters; keep existing method minimal)
    const countList = await startupGenerationEngine.getUserStartups(userId, {
      minScore: options.minScore,
      maxScore: options.maxScore,
      isPriority: options.isPriority,
      search: options.search,
      city: options.city,
      // Use a higher cap to prevent excessive memory on very large sets
      limit: 10000
    });
    const totalCount = countList.length;

    // Calculate advanced statistics if metadata is requested
    let statistics = {};
    if (options.includeMetadata) {
      statistics = await calculateAdvancedStatistics(userId, startups);
    }

    // Format response based on requested format
    if (options.format === 'summary') {
      return createSuccessResponse({
        summary: {
          totalStartups: totalCount,
          currentResults: startups.length,
          averageScore: startups.length > 0 ? 
            Math.round(startups.reduce((sum, s) => sum + s.rogueScore, 0) / startups.length) : 0,
          highQualityCount: startups.filter(s => s.rogueScore >= 80).length,
          cities: [...new Set(startups.map(s => s.city).filter(Boolean))].slice(0, 10)
        }
      }, {
        processingTime: Date.now() - startTime
      });
    }

    // Full JSON response
    const responseData = {
      startups,
      pagination: {
        total: totalCount,
        limit: options.limit,
        offset: options.offset,
        hasMore: options.offset + startups.length < totalCount,
        currentPage: Math.floor(options.offset / options.limit) + 1,
        totalPages: Math.ceil(totalCount / options.limit)
      },
      filters: {
        applied: Object.keys(filterOptions).filter(k => 
          filterOptions[k as keyof typeof filterOptions] !== undefined
        ).length,
        minScore: options.minScore,
        maxScore: options.maxScore,
        isPriority: options.isPriority,
        search: options.search,
        city: options.city
      },
      ...(options.includeMetadata && { statistics })
    };

    console.log(`✅ Retrieved ${startups.length} startups for user ${userId}`);

    return createSuccessResponse(responseData, {
      processingTime: Date.now() - startTime
    });

  } catch (error) {
    console.error('Error fetching startup results:', error);
    return createErrorResponse(
      error instanceof Error ? error.message : 'Failed to fetch startup results',
      'FETCH_RESULTS_ERROR',
      500
    );
  }
}

/**
 * Calculate advanced statistics for user's startups
 */
async function calculateAdvancedStatistics(userId: string, currentResults: any[]) {
  try {
    // Get user's overall statistics (using getUserStartups and calculating manually)
    const allUserStartups = await startupGenerationEngine.getUserStartups(userId, {
      limit: 1000 // Get all startups for statistics
    });
    
    const totalCount = allUserStartups.length;
    const avgScore = allUserStartups.length > 0 
      ? allUserStartups.reduce((sum, s) => sum + s.rogueScore, 0) / allUserStartups.length 
      : 0;

    // Calculate distribution statistics
    const scoreDistribution = {
      excellent: currentResults.filter(s => s.rogueScore >= 90).length,
      good: currentResults.filter(s => s.rogueScore >= 70 && s.rogueScore < 90).length,
      fair: currentResults.filter(s => s.rogueScore >= 50 && s.rogueScore < 70).length,
      poor: currentResults.filter(s => s.rogueScore < 50).length
    };

    // City distribution
    const cityDistribution = currentResults.reduce((acc, startup) => {
      const city = startup.city || 'Unknown';
      acc[city] = (acc[city] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Top cities (limited to 10)
    const topCities = Object.entries(cityDistribution)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 10)
      .map(([city, count]) => ({ city, count }));

    return {
      overview: {
        totalStartups: totalCount,
        averageScore: Math.round(avgScore),
        currentResults: currentResults.length
      },
      scoreDistribution,
      geography: {
        totalCities: Object.keys(cityDistribution).length,
        topCities
      },
      quality: {
        highQualityRate: totalCount > 0 ? 
          Math.round((currentResults.filter(s => s.rogueScore >= 80).length / currentResults.length) * 100) : 0,
        averageCurrentScore: currentResults.length > 0 ? 
          Math.round(currentResults.reduce((sum, s) => sum + s.rogueScore, 0) / currentResults.length) : 0
      }
    };
  } catch (error) {
    console.error('Error calculating statistics:', error);
    return {
      error: 'Statistics calculation failed',
      overview: {
        totalStartups: currentResults.length,
        averageScore: 0,
        currentResults: currentResults.length
      }
    };
  }
}
