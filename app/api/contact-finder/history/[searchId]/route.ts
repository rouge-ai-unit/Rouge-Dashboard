// ============================================================================
// CONTACT FINDER — SEARCH DETAIL API ROUTE
// GET    /api/contact-finder/history/[searchId] — Get full search details
// DELETE /api/contact-finder/history/[searchId] — Delete a specific search
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSearchById, deleteSearch } from '@/lib/contact-finder/database';

/**
 * GET /api/contact-finder/history/[searchId]
 * Returns full details of a specific search, including all extracted contacts.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ searchId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized. Please sign in.' },
        { status: 401 }
      );
    }

    const userId = session.user.email;
    const { searchId } = await params;

    if (!searchId) {
      return NextResponse.json(
        { success: false, message: 'Search ID is required.' },
        { status: 400 }
      );
    }

    const search = await getSearchById(searchId, userId);

    if (!search) {
      return NextResponse.json(
        { success: false, message: 'Search not found.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      search,
    });

  } catch (error) {
    console.error('[Contact Finder Detail] Error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch search details.' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/contact-finder/history/[searchId]
 * Deletes a specific search and all its associated contacts.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ searchId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized. Please sign in.' },
        { status: 401 }
      );
    }

    const userId = session.user.email;
    const { searchId } = await params;

    if (!searchId) {
      return NextResponse.json(
        { success: false, message: 'Search ID is required.' },
        { status: 400 }
      );
    }

    const deleted = await deleteSearch(searchId, userId);

    if (!deleted) {
      return NextResponse.json(
        { success: false, message: 'Search not found or unauthorized.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Search deleted successfully.',
    });

  } catch (error) {
    console.error('[Contact Finder Detail] Delete error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete search.' },
      { status: 500 }
    );
  }
}
