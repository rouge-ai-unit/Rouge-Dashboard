import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { startupGenerationEngine } from "@/lib/startup_seeker/startup-seeker";
import { 
  createErrorResponse, 
  createSuccessResponse, 
  ValidationErrors,
  isRateLimited 
} from '../utils/response-helpers';

// Enhanced validation schemas with strict limits
const generationSchema = z.object({
  numStartups: z.number().int().min(1).max(50).default(10),
  mode: z.enum(['traditional', 'ai', 'hybrid']).default('hybrid'),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  focusAreas: z.array(z.string()).max(5).default([]),
  excludeExisting: z.boolean().default(true),
  country: z.enum(['all', 'Thailand', 'Singapore', 'Indonesia', 'Malaysia', 'Philippines', 'Vietnam', 'Global']).default('all')
});

const getStartupsSchema = z.object({
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
  minScore: z.number().int().min(0).max(100).optional(),
  maxScore: z.number().int().min(0).max(100).optional(),
  sortBy: z.enum(['score', 'date', 'name', 'city']).default('score'),
  order: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().max(100).optional(),
  city: z.string().max(50).optional()
});

/**
 * POST /api/tools/startup-seeker/enhanced-generate
 * Generate startups using dual-mode scraping (Traditional/AI)
 * Enterprise-grade with comprehensive validation and performance optimization
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

    const userId = session.user.email;

    // Rate limiting check for generation requests
    if (isRateLimited(userId, 'startup_generation')) {
      return createErrorResponse(
        'Generation rate limit exceeded. Please wait before requesting more startups.',
        ValidationErrors.RATE_LIMITED.code,
        ValidationErrors.RATE_LIMITED.status
      );
    }

    // Parse and validate request body
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

    const validation = generationSchema.safeParse(body);
    if (!validation.success) {
      return createErrorResponse(validation.error);
    }

    const { numStartups, mode, priority, focusAreas, excludeExisting, country } = validation.data;

    console.log(`🔍 Starting enhanced startup generation for user ${userId}:`, {
      numStartups,
      mode,
      priority,
      country,
      focusAreas: focusAreas.length
    });

    // Validate mode-specific requirements
    if (mode === 'ai' && numStartups > 25) {
      return createErrorResponse(
        'AI mode is limited to 25 startups per request for quality assurance',
        'AI_MODE_LIMIT',
        400
      );
    }

    // Check user's existing startup count to prevent abuse
    const existingStartups = await startupGenerationEngine.getUserStartups(userId);
    const existingCount = existingStartups.length;
    if (existingCount > 500) {
      return createErrorResponse(
        'Maximum startup limit reached. Please manage your existing startups first.',
        'STARTUP_LIMIT_EXCEEDED',
        429
      );
    }

    console.log(`🌍 Using ${mode === 'ai' ? 'AI-powered' : mode === 'hybrid' ? 'Hybrid AI + Traditional' : 'Traditional'} mode with ${priority} priority for ${country}`);

    // Generate startups with enhanced options
    const startups = await startupGenerationEngine.generateStartupData(
      userId,
      numStartups,
      mode,
      country,
      excludeExisting
    );

    console.log(`✅ Generated ${startups.length} startups using ${mode} mode`);

    // Handle case where no new startups were found (e.g., all were existing and excluded)
    if (startups.length === 0) {
      return createSuccessResponse({
        startups: [],
        metadata: {
          count: 0,
          mode,
          priority,
          country,
          message: 'No new startups found. All discovered startups were already in your portfolio.',
          processingTime: Date.now() - startTime,
          focusAreas: focusAreas.length > 0 ? focusAreas : undefined
        },
        message: 'No new startups found - all discovered startups were already in your portfolio.',
        status: 'completed',
        jobId: null
      }, {
        processingTime: Date.now() - startTime
      });
    }

    // Save to database with performance optimization
    await startupGenerationEngine.saveStartupsToDatabase(startups, userId);

    // Calculate generation statistics
    const avgScore = startups.reduce((sum, s) => sum + s.rogueScore, 0) / startups.length;
    const highQualityCount = startups.filter(s => s.rogueScore >= 80).length;

    const responseData = {
      startups,
      metadata: {
        count: startups.length,
        mode,
        priority,
        country,
        averageScore: Math.round(avgScore),
        highQualityCount,
        qualityRate: Math.round((highQualityCount / startups.length) * 100),
        processingTime: Date.now() - startTime,
        focusAreas: focusAreas.length > 0 ? focusAreas : undefined
      },
      message: `Successfully generated ${startups.length} ${mode === 'ai' ? 'AI-powered' : 'traditional'} startups from ${country}`,
      status: 'completed',
      jobId: null // Direct processing, no job tracking needed
    };

    return createSuccessResponse(responseData, {
      processingTime: Date.now() - startTime
    });

  } catch (error) {
    console.error('Enhanced generation error:', error);
    
    // Determine specific error type
    let errorCode = 'GENERATION_ERROR';
    let statusCode = 500;
    
    if (error instanceof Error) {
      if (error.message.includes('rate limit')) {
        errorCode = 'RATE_LIMITED';
        statusCode = 429;
      } else if (error.message.includes('timeout')) {
        errorCode = 'GENERATION_TIMEOUT';
        statusCode = 408;
      } else if (error.message.includes('no startups')) {
        errorCode = 'NO_RESULTS';
        statusCode = 404;
      }
    }

    return createErrorResponse(
      error instanceof Error ? error.message : 'Failed to generate startups',
      errorCode,
      statusCode
    );
  }
}

/**
 * GET /api/tools/startup-seeker/enhanced-generate
 * Get user's startups with advanced filtering and pagination
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
    
    // Parse and validate query parameters
    const minScoreParam = searchParams.get('minScore');
    const maxScoreParam = searchParams.get('maxScore');
    const queryParams = {
      limit: parseInt(searchParams.get('limit') || '20', 10),
      offset: parseInt(searchParams.get('offset') || '0', 10),
      minScore: minScoreParam ? parseInt(minScoreParam, 10) : undefined,
      maxScore: maxScoreParam ? parseInt(maxScoreParam, 10) : undefined,
      sortBy: searchParams.get('sortBy') || 'score',
      order: searchParams.get('order') || 'desc',
      search: searchParams.get('search') || undefined,
      city: searchParams.get('city') || undefined
    };
    const validation = getStartupsSchema.safeParse(queryParams);
    if (!validation.success) {
      return createErrorResponse(validation.error);
    }

    const userId = session.user.email;
    const { limit, offset, minScore, maxScore, sortBy, order, search, city } = validation.data;

    // Engine-side filtering, sorting, pagination
    const startups = await startupGenerationEngine.getUserStartups(userId, {
      limit,
      offset,
      minScore,
      maxScore,
      sortBy: sortBy as any,
      order: order as any,
      search,
      city
    });

    // Compute total with same filters (bounded cap)
    const countList = await startupGenerationEngine.getUserStartups(userId, {
      minScore,
      maxScore,
      search,
      city,
      limit: 10000
    });
    const totalCount = countList.length;
    const avgScore = countList.length > 0 
      ? countList.reduce((sum, s) => sum + s.rogueScore, 0) / countList.length 
      : 0;

    const responseData = {
      startups,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount,
        currentPage: Math.floor(offset / limit) + 1,
        totalPages: Math.ceil(totalCount / limit)
      },
      statistics: {
        totalStartups: totalCount,
        averageScore: Math.round(avgScore),
        highQualityCount: startups.filter((s: any) => s.rogueScore >= 80).length,
        returningResults: startups.length
      }
    };

    return createSuccessResponse(responseData, {
      processingTime: Date.now() - startTime
    });

  } catch (error) {
    console.error('Error fetching enhanced startups:', error);
    return createErrorResponse(
      error instanceof Error ? error.message : 'Failed to fetch startups',
      'FETCH_ERROR',
      500
    );
  }
}
