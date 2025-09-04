import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { scrapingService } from "@/lib/scraping-service";
import { getDb } from "@/utils/dbConfig";
import { ScrapedStartups, ScrapingJobs } from "@/utils/schema";
import { eq, desc, and, gte, sql } from "drizzle-orm";

// Validation schemas
const scrapeRequestSchema = z.object({
  urls: z.array(z.string().url()).min(1).max(10),
  validateData: z.boolean().default(true),
  storeResults: z.boolean().default(true),
  maxRetries: z.number().int().min(1).max(5).default(3),
  targetCount: z.number().int().min(1).max(100).default(10)
});

const scrapingOptionsSchema = z.object({
  limit: z.number().int().min(1).max(100).default(50),
  minQualityScore: z.number().int().min(0).max(100).default(60),
  includeMetadata: z.boolean().default(true),
  sortBy: z.enum(['quality', 'date', 'name']).default('quality')
});

/**
 * POST /api/tools/startup-seeker/scrape
 * Trigger scraping of startup data from specified URLs
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Authentication required", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validation = scrapeRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid request data",
          details: validation.error.issues,
          code: "VALIDATION_ERROR"
        },
        { status: 400 }
      );
    }

    const { urls, validateData, storeResults, maxRetries, targetCount } = validation.data;
    const userId = session.user.email;

    console.log(`🔍 Starting scraping job for user ${userId} with ${urls.length} URLs, target: ${targetCount} startups`);

    // Start scraping in background
    const scrapingPromise = scrapingService.scrapeStartups(urls, userId, {
      validateData,
      storeResults,
      maxRetries,
      targetCount
    });

    // Don't await - let it run in background
    scrapingPromise.catch(error => {
      console.error('Background scraping failed:', error);
    });

    return NextResponse.json({
      success: true,
      message: "Scraping job started successfully",
      data: {
        urls: urls.length,
        status: "processing",
        estimatedTime: `${urls.length * 30} seconds`
      }
    });

  } catch (error) {
    console.error("Scraping API error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        code: "INTERNAL_ERROR"
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/tools/startup-seeker/scraped-data
 * Retrieve scraped startup data with filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Authentication required", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = session.user.email;

    // Parse query parameters
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const minQualityScore = parseInt(searchParams.get('minQualityScore') || '0');
    const sortBy = searchParams.get('sortBy') || 'quality';
    const industry = searchParams.get('industry');
    const country = searchParams.get('country');
    const search = searchParams.get('search');

    const db = getDb();

    // Build query conditions
    const conditions = [eq(ScrapedStartups.isValidated, true)];

    if (minQualityScore > 0) {
      conditions.push(gte(ScrapedStartups.validationScore, minQualityScore));
    }

    if (industry) {
      conditions.push(eq(ScrapedStartups.industry, industry));
    }

    if (country) {
      conditions.push(eq(ScrapedStartups.country, country));
    }

    if (search) {
      // Simple text search in name and description
      conditions.push(sql`${ScrapedStartups.name} ILIKE ${`%${search}%`} OR ${ScrapedStartups.description} ILIKE ${`%${search}%`}`);
    }

    // Determine sort order
    let orderBy;
    switch (sortBy) {
      case 'date':
        orderBy = desc(ScrapedStartups.scrapedAt);
        break;
      case 'name':
        orderBy = ScrapedStartups.name;
        break;
      case 'quality':
      default:
        orderBy = desc(ScrapedStartups.validationScore);
        break;
    }

    // Execute query
    const scrapedData = await db
      .select({
        id: ScrapedStartups.id,
        name: ScrapedStartups.name,
        website: ScrapedStartups.website,
        description: ScrapedStartups.description,
        city: ScrapedStartups.city,
        country: ScrapedStartups.country,
        industry: ScrapedStartups.industry,
        sourceName: ScrapedStartups.sourceName,
        validationScore: ScrapedStartups.validationScore,
        dataFreshness: ScrapedStartups.dataFreshness,
        scrapedAt: ScrapedStartups.scrapedAt,
        metadata: ScrapedStartups.metadata
      })
      .from(ScrapedStartups)
      .where(and(...conditions))
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    // Get total count for pagination
    const totalCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(ScrapedStartups)
      .where(and(...conditions));

    // Get summary statistics
    const stats = await db
      .select({
        totalStartups: sql<number>`count(*)`,
        avgQualityScore: sql<number>`avg(validation_score)`,
        topIndustries: sql<string>`string_agg(distinct industry, ', ')`,
        topCountries: sql<string>`string_agg(distinct country, ', ')`
      })
      .from(ScrapedStartups)
      .where(eq(ScrapedStartups.isValidated, true));

    return NextResponse.json({
      success: true,
      data: {
        startups: scrapedData,
        pagination: {
          total: totalCount[0].count,
          limit,
          offset,
          hasMore: offset + limit < totalCount[0].count
        },
        statistics: {
          totalScraped: stats[0].totalStartups,
          averageQualityScore: Math.round(stats[0].avgQualityScore || 0),
          industries: stats[0].topIndustries?.split(', ') || [],
          countries: stats[0].topCountries?.split(', ') || []
        }
      }
    });

  } catch (error) {
    console.error("Scraped data API error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        code: "INTERNAL_ERROR"
      },
      { status: 500 }
    );
  }
}
