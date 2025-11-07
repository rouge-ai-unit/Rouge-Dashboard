/**
 * API Route: Get Tool Access Requests
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getPendingToolAccessRequests } from '@/lib/auth/auth-service';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Check if user is admin
    const userRole = (session.user as any)?.role;
    if (userRole !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }
    
    // Get pending tool requests
    const requests = await getPendingToolAccessRequests();
    
    return NextResponse.json({
      success: true,
      requests: requests.map(r => ({
        id: r.request.id,
        userId: r.request.userId,
        toolName: r.request.toolName,
        toolPath: r.request.toolPath,
        justification: r.request.justification,
        status: r.request.status,
        createdAt: r.request.createdAt,
        user: {
          id: r.user?.id,
          email: r.user?.email,
          displayName: r.user?.displayName,
          role: r.user?.role,
          unit: r.user?.unit,
        }
      }))
    });
  } catch (error) {
    console.error('[Admin API] Error fetching tool requests:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
