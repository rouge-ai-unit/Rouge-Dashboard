// ============================================================================
// SENTIMENT ANALYZER - AUTO CLEANUP API ROUTE
// POST /api/sentiment-analyzer/cleanup
// Scheduled task to clean up old data (90+ days)
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { autoCleanupOldData } from '@/lib/sentiment-analyzer/database';

/**
 * POST - Run auto cleanup
 * Removes data older than 90 days automatically
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[Auto Cleanup] Starting scheduled cleanup...');

    // Run cleanup
    const result = await autoCleanupOldData();

    console.log(`[Auto Cleanup] Complete! Removed ${result.articles} articles and ${result.history} history entries`);

    return NextResponse.json(
      {
        success: true,
        message: 'Cleanup completed successfully',
        articlesDeleted: result.articles,
        historyDeleted: result.history,
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('[Auto Cleanup] Error:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred during cleanup',
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
