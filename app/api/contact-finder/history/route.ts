// ============================================================================
// CONTACT FINDER — HISTORY API ROUTE
// GET  /api/contact-finder/history — List all searches for the user
// DELETE /api/contact-finder/history — Delete all search history
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSearchHistory, deleteAllSearches } from '@/lib/contact-finder/database';

/**
 * GET /api/contact-finder/history
 * Returns paginated search history for the authenticated user.
 *
 * Query params:
 *   - limit  (optional, default 20, max 100)
 *   - offset (optional, default 0)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized. Please sign in.' },
        { status: 401 }
      );
    }

    const userId = session.user.email;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const searches = await getSearchHistory(userId, limit, offset);

    return NextResponse.json({
      success: true,
      searches,
      total: searches.length,
    });

  } catch (error) {
    console.error('[Contact Finder History] Error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch search history.' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/contact-finder/history
 * Deletes all search history for the authenticated user.
 */
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized. Please sign in.' },
        { status: 401 }
      );
    }

    const userId = session.user.email;
    const deletedCount = await deleteAllSearches(userId);

    return NextResponse.json({
      success: true,
      message: `Deleted ${deletedCount} search(es) from history.`,
      deletedCount,
    });

  } catch (error) {
    console.error('[Contact Finder History] Delete error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete search history.' },
      { status: 500 }
    );
  }
}
