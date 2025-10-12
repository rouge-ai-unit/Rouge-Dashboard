// ============================================================================
// SENTIMENT ANALYZER - RESULTS API ROUTE
// GET /api/sentiment-analyzer/results?company=Apple&page=1&limit=10
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getArticlesByCompany } from '@/lib/sentiment-analyzer/database';
import { GetResultsResponse, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '@/types/sentiment-analyzer';

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
    const company = searchParams.get('company');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(
      parseInt(searchParams.get('limit') || DEFAULT_PAGE_SIZE.toString()),
      MAX_PAGE_SIZE
    );

    // 3. Validate parameters
    if (!company) {
      return NextResponse.json(
        { success: false, message: 'Company parameter is required' },
        { status: 400 }
      );
    }

    if (page < 1) {
      return NextResponse.json(
        { success: false, message: 'Page must be greater than 0' },
        { status: 400 }
      );
    }

    if (limit < 1 || limit > MAX_PAGE_SIZE) {
      return NextResponse.json(
        { success: false, message: `Limit must be between 1 and ${MAX_PAGE_SIZE}` },
        { status: 400 }
      );
    }

    console.log(`[Get Results] User: ${userId}, Company: ${company}, Page: ${page}, Limit: ${limit}`);

    // 4. Fetch articles from database
    const { articles, total } = await getArticlesByCompany(company, userId, { page, limit });

    // 5. Return response
    const response: GetResultsResponse = {
      success: true,
      articles,
      total,
      page,
      limit,
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('[Get Results] Error:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred while fetching results',
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
