/**
 * API Route: Get Admin Activity Logs
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/middleware/apiAuth';
import { getAdminActivityLogs } from '@/lib/auth/auth-service';

export async function GET(request: NextRequest) {
  try {
    // Check authorization
    const auth = await requireRole(request, { requiredRole: 'admin' });
    if (!auth.authorized) {
      return auth.response!;
    }
    
    // Get activity logs
    const logs = await getAdminActivityLogs({ limit: 100 });
    
    return NextResponse.json({
      success: true,
      logs: logs.map(l => ({
        id: l.log.id,
        adminId: l.log.adminId,
        action: l.log.action,
        targetUserId: l.log.targetUserId,
        targetResource: l.log.targetResource,
        oldValue: l.log.oldValue,
        newValue: l.log.newValue,
        reason: l.log.reason,
        createdAt: l.log.createdAt,
        admin: {
          displayName: l.admin?.displayName,
          email: l.admin?.email,
        }
      }))
    });
  } catch (error) {
    console.error('[Admin API] Error fetching activity logs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
