// ============================================================================
// SENTIMENT ANALYZER - USAGE API ROUTE
// GET /api/sentiment-analyzer/usage
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getTodayUsage } from '@/lib/sentiment-analyzer/database';
import { GetUsageResponse, SENTIMENT_DAILY_LIMIT } from '@/types/sentiment-analyzer';

export async function GET(request: NextRequest) {
  try {
    // 1. Authentication check
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized. Please sign in.' },
        { status: 401 }
      );
    }

    const userId = session.user.email;

    console.log(`[Get Usage] User: ${userId}`);

    // 2. Fetch today's usage from database
    const usage = await getTodayUsage(userId);

    // 3. Calculate remaining searches
    const remaining = Math.max(0, SENTIMENT_DAILY_LIMIT - usage.count);

    // 4. Return response
    const response: GetUsageResponse = {
      success: true,
      count: usage.count,
      limit: SENTIMENT_DAILY_LIMIT,
      resetAt: usage.resetAt.toISOString(),
      remaining,
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('[Get Usage] Error:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred while fetching usage data',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// OPTIONS for CORS
export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}
