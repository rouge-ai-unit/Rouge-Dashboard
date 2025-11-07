/**
 * API Route: Get Pending User Approvals
 * Returns count and list of users awaiting approval
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/middleware/apiAuth';
import { getPendingApprovals } from '@/lib/auth/auth-service';

export async function GET(request: NextRequest) {
  try {
    // Check authorization
    const auth = await requireRole(request, { requiredRole: 'admin' });
    if (!auth.authorized) {
      return auth.response!;
    }
    
    // Get pending approvals
    const approvals = await getPendingApprovals();
    
    return NextResponse.json({
      success: true,
      count: approvals.length,
      approvals: approvals.map(a => ({
        id: a.approval.id,
        userId: a.approval.userId,
        requestedRole: a.approval.requestedRole,
        requestedUnit: a.approval.requestedUnit,
        justification: a.approval.justification,
        status: a.approval.status,
        createdAt: a.approval.createdAt,
        user: {
          id: a.user?.id,
          email: a.user?.email,
          firstName: a.user?.firstName,
          lastName: a.user?.lastName,
          displayName: a.user?.displayName,
          avatar: a.user?.avatar,
        }
      }))
    });
  } catch (error) {
    console.error('[Admin API] Error fetching pending approvals:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
