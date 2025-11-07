/**
 * API Route: Get Permission Audit Trail
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/middleware/apiAuth';
import { getPermissionAuditTrail } from '@/lib/auth/auth-service';

export async function GET(request: NextRequest) {
  try {
    // Check authorization
    const auth = await requireRole(request, { requiredRole: 'admin' });
    if (!auth.authorized) {
      return auth.response!;
    }
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const adminId = searchParams.get('adminId') || undefined;
    const role = searchParams.get('role') || undefined;
    const resource = searchParams.get('resource') || undefined;
    const changeType = searchParams.get('changeType') || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 100;
    
    // Get audit trail
    const auditTrail = await getPermissionAuditTrail({
      adminId,
      role,
      resource,
      changeType,
      limit,
    });
    
    return NextResponse.json({
      success: true,
      auditTrail,
      count: auditTrail.length,
    });
  } catch (error) {
    console.error('[Admin API] Error fetching permission audit trail:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
