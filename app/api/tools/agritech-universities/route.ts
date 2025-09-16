import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { aiUniversityScrapingService } from "@/lib/university_scraping/ai-university-scraper";
import { traditionalUniversityScrapingService } from "@/lib/university_scraping/traditional-university-scraper";
import { getDb } from "@/utils/dbConfig";
import { AgritechUniversitiesResults } from "@/utils/schema";
import { desc, eq, sql } from "drizzle-orm";
import { monitoringService, withMonitoring, logError, logInfo } from "@/lib/monitoring";

// ============================================================================
// ENTERPRISE AGRITECH UNIVERSITIES EXTRACTION API
// Production-ready, real-time processing with robust error handling
// ============================================================================

const requestSchema = z.object({
  limit: z.number().int().min(1).max(100).default(10),
  country: z.string().optional().default("Thailand"),
  includeAnalysis: z.boolean().optional().default(true),
  mode: z.enum(['traditional', 'ai', 'hybrid']).optional().default('hybrid'),
});

// Rate limiting configuration (production-ready)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 10; // requests per hour per user
const RATE_WINDOW = 60 * 60 * 1000; // 1 hour

interface ProcessingMetadata {
  startTime: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  processingTime: number;
  qualityScore: number;
}

interface EnhancedUniversityData {
  id: string;
  university: string;
  country: string;
  region: string;
  website: string | null;
  hasAgriculture: boolean;
  hasTto: boolean;
  ttoPageUrl: string | null;
  incubationRecord: string | null;
  linkedinSearchUrl: string;
  qualityScore: number;
  lastVerified: string;
  analysisNotes?: string;
}

/**
 * Rate limiting check for user requests
 */
function checkRateLimit(userId: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const userLimit = rateLimitMap.get(userId);

  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(userId, { count: 1, resetTime: now + RATE_WINDOW });
    return { allowed: true };
  }

  if (userLimit.count >= RATE_LIMIT) {
    return { 
      allowed: false, 
      retryAfter: Math.ceil((userLimit.resetTime - now) / 1000) 
    };
  }

  userLimit.count++;
  return { allowed: true };
}

/**
 * Calculate quality score for university data
 */
function calculateQualityScore(data: any): number {
  let score = 0;
  const maxScore = 100;

  // University name quality (20 points)
  if (data.university && data.university.length > 3) score += 20;
  
  // Website availability (15 points)
  if (data.website && data.website !== "N/A" && data.website.includes('.')) score += 15;
  
  // TTO information (25 points)
  if (data.hasTto) score += 15;
  if (data.ttoPageUrl && data.ttoPageUrl !== "N/A") score += 10;
  
  // Incubation record (20 points)
  if (data.incubationRecord && data.incubationRecord !== "Not Found") score += 20;
  
  // Data completeness (20 points)
  const completedFields = [data.university, data.country, data.region, data.website, data.linkedinSearchUrl]
    .filter(field => field && field !== "N/A").length;
  score += (completedFields / 5) * 20;

  return Math.min(score, maxScore);
}

/**
 * POST endpoint for dual-mode university extraction with comprehensive monitoring
 */
export const POST = withMonitoring(async (request: NextRequest) => {
  const startTime = Date.now();

  // Parse and validate request
  let mode: 'traditional' | 'ai' | 'hybrid' = 'hybrid';
  let limit = 10;
  let country = 'Thailand';
  let includeAnalysis = true;

  try {
    // Authentication check
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      logError('agritech-universities', 'Unauthorized access attempt');
      return NextResponse.json(
        { 
          success: false,
          error: "Authentication required", 
          code: "UNAUTHORIZED",
          timestamp: new Date().toISOString()
        },
        { status: 401 }
      );
    }

    const userId = session.user.email;

    logInfo('agritech-universities', `Request started for user: ${session.user.email}`);

    try {
      const body = await request.json();
      const parsed = requestSchema.parse(body);
      mode = parsed.mode;
      limit = parsed.limit;
      country = parsed.country;
      includeAnalysis = parsed.includeAnalysis;
      
      console.log(`🎯 Parsed request: mode=${mode}, limit=${limit}, country=${country}, analysis=${includeAnalysis}`);
    } catch (parseError) {
      console.error('Request parsing error:', parseError);
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request parameters",
          code: "VALIDATION_ERROR",
          details: parseError instanceof Error ? parseError.message : 'Invalid JSON or schema',
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }

    // Rate limiting check
    const rateLimitCheck = checkRateLimit(session.user.email);
    if (!rateLimitCheck.allowed) {
      console.warn(`Rate limit exceeded for user ${session.user.email}`);
      return NextResponse.json(
        {
          success: false,
          error: "Rate limit exceeded. Please try again later.",
          code: "RATE_LIMIT_EXCEEDED",
          retryAfter: rateLimitCheck.retryAfter,
          timestamp: new Date().toISOString()
        },
        { 
          status: 429,
          headers: {
            'Retry-After': rateLimitCheck.retryAfter?.toString() || '3600'
          }
        }
      );
    }

    console.log(`� Starting enhanced ${mode} university extraction for ${session.user.email}:`);
    console.log(`   • Target: ${limit} universities`);
    console.log(`   • Country: ${country}`);
    console.log(`   • Analysis: ${includeAnalysis ? 'enabled' : 'disabled'}`);
    console.log(`   • Timestamp: ${new Date().toISOString()}`);

    let extractionResult: any;

      // Choose extraction mode with intelligent hybrid processing
      if (mode === 'ai') {
        console.log('🤖 Using AI-powered extraction');
        extractionResult = await aiUniversityScrapingService.extractUniversities(
          limit,
          country,
          'ai'
        );
      } else if (mode === 'traditional') {
        console.log('🌐 Using traditional web scraping');
        extractionResult = await traditionalUniversityScrapingService.extractUniversities(
          country,
          limit,
          includeAnalysis
        );
      } else {
        console.log('🔄 Using hybrid AI + Traditional processing for maximum reliability');
        
        // Hybrid approach: Start with AI for speed, enhance with traditional for accuracy
        const aiLimit = Math.ceil(limit * 0.6); // 60% from AI
        const traditionalLimit = limit - aiLimit; // 40% from traditional
        
        // Step 1: AI extraction (faster, broader coverage)
        console.log(`🤖 Phase 1: AI extraction (${aiLimit} universities)`);
        const aiResult = await aiUniversityScrapingService.extractUniversities(
          aiLimit,
          country,
          'ai'
        );
        
        // Step 2: Traditional extraction (higher accuracy)
        console.log(`🌐 Phase 2: Traditional extraction (${traditionalLimit} universities)`);
        const traditionalResult = await traditionalUniversityScrapingService.extractUniversities(
          country,
          traditionalLimit,
          includeAnalysis
        );
        
        // Step 3: Combine and deduplicate results
        const aiData = aiResult.success ? aiResult.data : [];
        const traditionalData = traditionalResult.success ? traditionalResult.data : [];
        
        // Convert traditional data to match AI data structure
        const enhancedTraditionalData = traditionalData.map((traditional: any) => ({
          ...traditional,
          verified: traditional.qualityScore >= 80,
          sources: ['traditional-web-scraping', 'verified-sources'],
          confidence: traditional.qualityScore / 100,
          lastVerified: new Date().toISOString(),
          processingMethod: 'traditional-enhanced' as const,
          dataSource: 'hybrid-verified' as const
        }));
        
        // Deduplicate by university name and enhance quality scores
        const combinedData = [...aiData];
        const existingNames = new Set(aiData.map((u: any) => u.university.toLowerCase()));
        
        for (const traditional of enhancedTraditionalData) {
          if (!existingNames.has(traditional.university.toLowerCase())) {
            // Mark traditional data as higher quality
            traditional.qualityScore = Math.min(traditional.qualityScore + 10, 100);
            combinedData.push(traditional);
          }
        }
        
        // Sort by quality score and take top results
        const sortedData = combinedData
          .sort((a: any, b: any) => b.qualityScore - a.qualityScore)
          .slice(0, limit);
        
        // Build hybrid result
        extractionResult = {
          success: true,
          data: sortedData,
          errors: [...(aiResult.errors || []), ...(traditionalResult.errors || [])],
          metadata: {
            totalExtracted: sortedData.length,
            successfulRequests: (aiResult.metadata?.successfulRequests || 0) + (traditionalResult.metadata?.successfulRequests || 0),
            failedRequests: (aiResult.metadata?.failedRequests || 0) + (traditionalResult.metadata?.failedRequests || 0),
            processingTime: Date.now() - startTime,
            averageQualityScore: sortedData.reduce((sum: number, u: any) => sum + u.qualityScore, 0) / sortedData.length,
            verificationRate: sortedData.filter((u: any) => u.qualityScore >= 80).length / sortedData.length,
            sourcesUsed: ['ai-hybrid', 'traditional-hybrid'],
            mode: 'hybrid',
            aiResults: aiData.length,
            traditionalResults: traditionalData.length,
            duplicatesRemoved: aiData.length + traditionalData.length - sortedData.length,
            hybridSuccessRate: sortedData.length / limit
          }
        };
        
        console.log(`✅ Hybrid processing: ${aiData.length} AI + ${traditionalData.length} traditional = ${sortedData.length} final results`);
      }

      if (!extractionResult.success) {
        throw new Error(extractionResult.errors.join('; ') || 'Extraction failed');
      }

      // Persist to database
      const dbInsertPromises = extractionResult.data.map(async (university: any) => {
        try {
          await getDb().insert(AgritechUniversitiesResults).values({
            university: university.university,
            country: university.country,
            region: university.region,
            website: university.website,
            hasTto: university.hasTto,
            ttoPageUrl: university.ttoPageUrl,
            incubationRecord: university.incubationRecord,
            linkedinSearchUrl: university.linkedinSearchUrl,
            userId: userId,
          });
          return true;
        } catch (dbError) {
          console.error('Database insertion error:', dbError);
          return false;
        }
      });

      const dbResults = await Promise.allSettled(dbInsertPromises);
      const successfulInserts = dbResults.filter(r => r.status === 'fulfilled' && r.value).length;
      const failedInserts = dbResults.length - successfulInserts;

      // Update metadata with database results
      extractionResult.metadata.successfulInserts = successfulInserts;
      extractionResult.metadata.failedInserts = failedInserts;
      extractionResult.metadata.mode = mode;

      console.log(`✅ ${mode} extraction completed: ${extractionResult.data.length} universities, ${successfulInserts} saved to DB`);

      return NextResponse.json({
        success: true,
        data: extractionResult.data,
        metadata: {
          ...extractionResult.metadata,
          timestamp: new Date().toISOString(),
          version: "2.0.0-dual-mode",
          mode: mode
        },
        pagination: {
          total: extractionResult.data.length,
          page: 1,
          limit: limit,
          hasMore: false
        }
      });

    } catch (error) {
      console.error(`❌ ${mode || 'Unknown'} extraction failed:`, error);
      
      const errorMessage = error instanceof Error ? error.message : 'Internal server error';
      const processingTime = Date.now() - startTime;

      const metadata = {
        totalExtracted: 0,
        successfulInserts: 0,
        failedInserts: 0,
        averageQualityScore: 0,
        processingTime,
        processingTimeMs: processingTime,
        requestedLimit: 0,
        actualLimit: 0,
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 1,
        successfulCount: 0,
        successRate: 0,
        totalProcessed: 0
      };

      return NextResponse.json(
        {
          error: "Processing failed",
          code: "INTERNAL_ERROR",
          message: errorMessage,
          metadata,
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      );
    }
}, 'agritech-universities');

/**
 * GET endpoint for retrieving historical results with monitoring
 */
export const GET = withMonitoring(async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Authentication required", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const userId = session.user.email;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const orderBy = searchParams.get('orderBy') || 'createdAt';
    const order = searchParams.get('order') || 'desc';

    // Validate parameters
    if (page < 1 || limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: "Invalid pagination parameters", code: "INVALID_PARAMS" },
        { status: 400 }
      );
    }

    const offset = (page - 1) * limit;

    // Create a mapping for valid orderBy columns
    const validOrderColumns = {
      'createdAt': AgritechUniversitiesResults.createdAt,
      'university': AgritechUniversitiesResults.university,
      'country': AgritechUniversitiesResults.country,
      'region': AgritechUniversitiesResults.region
    } as const;

    type ValidOrderBy = keyof typeof validOrderColumns;
    const orderColumn = validOrderColumns[orderBy as ValidOrderBy] || AgritechUniversitiesResults.createdAt;

    // Fetch results with pagination
    const results = await getDb()
      .select()
      .from(AgritechUniversitiesResults)
      .where(eq(AgritechUniversitiesResults.userId, userId))
      .orderBy(order === 'desc' ? desc(orderColumn) : orderColumn)
      .limit(limit)
      .offset(offset);

    // Get total count
    const totalCountResult = await getDb()
      .select({ count: sql<number>`count(*)` })
      .from(AgritechUniversitiesResults)
      .where(eq(AgritechUniversitiesResults.userId, userId));

    const totalCount = totalCountResult[0]?.count || 0;
    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      success: true,
      data: results,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Error fetching agritech results:", error);
    return NextResponse.json(
      { error: "Failed to fetch results", code: "FETCH_ERROR" },
      { status: 500 }
    );
  }
}, 'agritech-universities-get');