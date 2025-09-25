/**
 * System Monitoring API Endpoint
 * 
 * Provides real-time system health, metrics, and error logs
 * For production monitoring and debugging
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { monitoringService, withMonitoring } from '@/lib/monitoring';
import { unifiedAIService } from '@/lib/ai-service';

/**
 * GET /api/monitoring/health
 * Get system health summary
 */
export const GET = withMonitoring(async function GET(request: NextRequest) {
  try {
    // Optional: Add authentication check for production
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      // For now, allow monitoring access - in production you might restrict this
      // return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const detailed = searchParams.get('detailed') === 'true';

    if (detailed) {
      // Return comprehensive system metrics
      const systemMetrics = monitoringService.getSystemMetrics();
      const aiMetrics = unifiedAIService.getMetrics();
      const aiHealth = unifiedAIService.getProviderHealth();

      return NextResponse.json({
        success: true,
        data: {
          ...systemMetrics,
          aiService: {
            ...systemMetrics.aiService,
            ...aiMetrics,
            providerHealth: aiHealth
          },
          timestamp: new Date().toISOString(),
          version: '1.0.0'
        }
      });
    } else {
      // Return basic health summary
      const healthSummary = monitoringService.getHealthSummary();
      const aiHealth = unifiedAIService.getProviderHealth();

      return NextResponse.json({
        success: true,
        data: {
          health: healthSummary,
          aiProviders: aiHealth,
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          version: '1.0.0'
        }
      });
    }

  } catch (error) {
    console.error('Monitoring API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve monitoring data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}, 'monitoring-api');

/**
 * POST /api/monitoring/health
 * Reset metrics or clear error logs
 */
export const POST = withMonitoring(async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'reset_metrics':
        monitoringService.resetMetrics();
        return NextResponse.json({
          success: true,
          message: 'Metrics reset successfully'
        });

      case 'clear_ai_cache':
        unifiedAIService.clearCache();
        return NextResponse.json({
          success: true,
          message: 'AI cache cleared successfully'
        });

      case 'reset_ai_metrics':
        unifiedAIService.resetMetrics();
        return NextResponse.json({
          success: true,
          message: 'AI metrics reset successfully'
        });

      case 'resolve_error':
        const { errorId } = body;
        if (!errorId) {
          return NextResponse.json({
            success: false,
            error: 'Error ID required'
          }, { status: 400 });
        }
        
        const resolved = monitoringService.resolveError(errorId);
        return NextResponse.json({
          success: resolved,
          message: resolved ? 'Error marked as resolved' : 'Error not found'
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action'
        }, { status: 400 });
    }

  } catch (error) {
    console.error('Monitoring action error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to perform monitoring action',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}, 'monitoring-actions');
