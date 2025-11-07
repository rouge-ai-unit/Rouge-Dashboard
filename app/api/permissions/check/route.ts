/**
 * API Route: Check User Permission
 * Real-time permission checking against database
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { canAccessTool } from '@/lib/permissions';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { hasAccess: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const userId = (session.user as any)?.id;
    const searchParams = request.nextUrl.searchParams;
    const toolPath = searchParams.get('toolPath');
    
    if (!toolPath) {
      return NextResponse.json(
        { hasAccess: false, error: 'Tool path is required' },
        { status: 400 }
      );
    }
    
    // Check if user can access the tool
    const hasAccess = await canAccessTool(userId, toolPath);
    
    return NextResponse.json({
      hasAccess,
      toolPath,
      userId,
    });
  } catch (error) {
    console.error('[Permissions API] Error checking permission:', error);
    return NextResponse.json(
      { hasAccess: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
