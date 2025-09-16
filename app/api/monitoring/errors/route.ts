/**
 * Error Logging API Endpoint
 * 
 * Provides access to system error logs with filtering and search
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { monitoringService, withMonitoring } from '@/lib/monitoring';

/**
 * GET /api/monitoring/errors
 * Get filtered error logs
 */
export const GET = withMonitoring(async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const service = searchParams.get('service') || undefined;
    const level = searchParams.get('level') as 'error' | 'warn' | 'info' | undefined;
    const limit = parseInt(searchParams.get('limit') || '50');

    const errors = monitoringService.getErrorLogs(service, level, limit);

    return NextResponse.json({
      success: true,
      data: {
        errors,
        total: errors.length,
        filters: { service, level, limit },
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error logs API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve error logs',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}, 'error-logs-api');