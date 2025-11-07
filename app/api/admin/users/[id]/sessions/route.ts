/**
 * API Route: User Sessions Management
 * Get and manage user sessions
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/middleware/apiAuth';
import { getDb } from '@/utils/dbConfig';
import { Sessions } from '@/utils/auth-schema';
import { eq, and, desc } from 'drizzle-orm';
import { logAdminActivity } from '@/lib/auth/auth-service';
import { revokeSession, revokeAllUserSessions } from '@/lib/security/session-manager';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authorization
    const auth = await requireRole(request, { requiredRole: 'admin' });
    if (!auth.authorized) {
      return auth.response!;
    }
    
    const db = getDb();
    const userId = params.id;
    
    // Get all sessions for the user
    const sessions = await db
      .select()
      .from(Sessions)
      .where(eq(Sessions.userId, userId))
      .orderBy(desc(Sessions.createdAt));
    
    return NextResponse.json({
      success: true,
      sessions,
    });
  } catch (error) {
    console.error('[Admin API] Error fetching user sessions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authorization
    const auth = await requireRole(request, { requiredRole: 'admin' });
    if (!auth.authorized) {
      return auth.response!;
    }
    
    const db = getDb();
    const userId = params.id;
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    
    if (sessionId) {
      // Revoke specific session using session manager
      await revokeSession(sessionId);
      
      // Log admin activity
      await logAdminActivity({
        adminId: auth.userId!,
        action: 'revoke_user_session',
        targetUserId: userId,
        targetResource: 'session',
        reason: 'Session revoked by admin',
      });
      
      return NextResponse.json({
        success: true,
        message: 'Session revoked successfully',
      });
    } else {
      // Revoke all sessions using session manager
      await revokeAllUserSessions(userId);
      
      // Log admin activity
      await logAdminActivity({
        adminId: auth.userId!,
        action: 'revoke_all_user_sessions',
        targetUserId: userId,
        targetResource: 'sessions',
        reason: 'All sessions revoked by admin',
      });
      
      return NextResponse.json({
        success: true,
        message: 'All sessions revoked successfully',
      });
    }
  } catch (error) {
    console.error('[Admin API] Error revoking sessions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
