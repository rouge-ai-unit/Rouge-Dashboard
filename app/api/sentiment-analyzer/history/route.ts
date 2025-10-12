// ============================================================================
// SENTIMENT ANALYZER - HISTORY API ROUTE
// GET /api/sentiment-analyzer/history?search_query=Apple&limit=20
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSearchHistory } from '@/lib/sentiment-analyzer/database';
import { GetHistoryResponse } from '@/types/sentiment-analyzer';

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

    // 2. Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const searchQuery = searchParams.get('search_query') || undefined;
    const limit = parseInt(searchParams.get('limit') || '20');

    // 3. Validate parameters
    if (limit < 1 || limit > 100) {
      return NextResponse.json(
        { success: false, message: 'Limit must be between 1 and 100' },
        { status: 400 }
      );
    }

    console.log(`[Get History] User: ${userId}, Search: ${searchQuery || 'all'}, Limit: ${limit}`);

    // 4. Fetch search history from database
    const history = await getSearchHistory(userId, searchQuery, limit);

    // 5. Return response
    const response: GetHistoryResponse = {
      success: true,
      history,
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('[Get History] Error:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred while fetching search history',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Clear search history
 */
export async function DELETE(request: NextRequest) {
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

    console.log(`[Clear History] User: ${userId}`);

    // 2. Import clearSearchHistory function
    const { clearSearchHistory } = await import('@/lib/sentiment-analyzer/database');

    // 3. Clear search history
    const deletedCount = await clearSearchHistory(userId);

    console.log(`[Clear History] Deleted ${deletedCount} entries for user: ${userId}`);

    // 4. Return response
    return NextResponse.json(
      {
        success: true,
        message: `Successfully cleared ${deletedCount} search history entries`,
        deletedCount,
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('[Clear History] Error:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred while clearing search history',
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
