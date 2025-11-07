/**
 * API Route: Get Tool Access Requests Count
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/utils/dbConfig';
import { ToolAccessRequests } from '@/utils/auth-schema';
import { count, eq } from 'drizzle-orm';

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
    
    // Get pending tool requests count
    const db = getDb();
    const result = await db
      .select({ count: count() })
      .from(ToolAccessRequests)
      .where(eq(ToolAccessRequests.status, 'pending'));
    
    return NextResponse.json({
      success: true,
      count: result[0]?.count || 0
    });
  } catch (error) {
    console.error('[Admin API] Error fetching tool requests count:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
