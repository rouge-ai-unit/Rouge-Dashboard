import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { startupGenerationEngine } from "@/lib/startup-generation-engine";

// Validation schemas
const generationSchema = z.object({
  numStartups: z.number().int().min(1).max(50).default(10),
  mode: z.enum(['market-data']).default('market-data')
});

/**
 * POST /api/tools/startup-seeker/enhanced-generate
 * Generate startups using pure web scraping
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const userId = session.user.email;

    const body = await request.json();
    const validation = generationSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { 
          error: "Invalid request data",
          details: validation.error.errors
        },
        { status: 400 }
      );
    }

    const options = validation.data;
    const { numStartups } = options;

    console.log(`🔍 Starting startup generation for user ${userId}:`, {
      numStartups: options.numStartups,
      mode: options.mode
    });

    // Validate mode
    if (options.mode !== 'market-data') {
      return NextResponse.json(
        { error: 'Only market-data mode is supported' },
        { status: 400 }
      );
    }

    console.log(`🌍 Using Market Data mode (web scraping only)`);

    // Generate startups directly using web scraping
    const startups = await startupGenerationEngine.generateStartupData(
      userId,
      numStartups
    );

    console.log(`✅ Generated ${startups.length} startups using web scraping`);

    // Save to database
    await startupGenerationEngine.saveStartupsToDatabase(startups, userId);

    return NextResponse.json({
      success: true,
      startups: startups,
      message: `Generated ${startups.length} startups using web scraping`,
      count: startups.length,
      status: 'completed',
      jobId: null // Indicate this is a direct response, not a job
    });

  } catch (error) {
    console.error('Generation error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate startups',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/tools/startup-seeker/enhanced-generate
 * Get recent startup generation results
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const userId = session.user.email;

    // Get user's recent startups
    const startups = await startupGenerationEngine.getUserStartups(
      userId,
      { limit: 20 }
    );

    return NextResponse.json({
      success: true,
      startups: startups,
      count: startups.length
    });

  } catch (error) {
    console.error('Error fetching startups:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch startups',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}