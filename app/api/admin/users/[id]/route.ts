/**
 * API Route: Single User Details
 * Get detailed information about a specific user
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/middleware/apiAuth';
import { getDb } from '@/utils/dbConfig';
import { Users, Sessions, AdminActivityLogs, RoleChangeHistory, ToolAccessRequests } from '@/utils/auth-schema';
import { eq, and, desc } from 'drizzle-orm';

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
    
    // Get user details
    const [user] = await db
      .select()
      .from(Users)
      .where(eq(Users.id, userId))
      .limit(1);
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Get user's sessions
    const sessions = await db
      .select({
        id: Sessions.id,
        ipAddress: Sessions.ipAddress,
        device: Sessions.device,
        browser: Sessions.browser,
        os: Sessions.os,
        isActive: Sessions.isActive,
        createdAt: Sessions.createdAt,
        lastActivityAt: Sessions.lastActivityAt,
        expiresAt: Sessions.expiresAt,
      })
      .from(Sessions)
      .where(eq(Sessions.userId, userId))
      .orderBy(desc(Sessions.createdAt))
      .limit(10);
    
    // Get role change history
    const roleHistory = await db
      .select({
        id: RoleChangeHistory.id,
        oldRole: RoleChangeHistory.oldRole,
        newRole: RoleChangeHistory.newRole,
        oldUnit: RoleChangeHistory.oldUnit,
        newUnit: RoleChangeHistory.newUnit,
        reason: RoleChangeHistory.reason,
        createdAt: RoleChangeHistory.createdAt,
        changedByName: Users.displayName,
      })
      .from(RoleChangeHistory)
      .leftJoin(Users, eq(RoleChangeHistory.changedBy, Users.id))
      .where(eq(RoleChangeHistory.userId, userId))
      .orderBy(desc(RoleChangeHistory.createdAt))
      .limit(20);
    
    // Get admin actions on this user
    const adminActions = await db
      .select({
        id: AdminActivityLogs.id,
        action: AdminActivityLogs.action,
        targetResource: AdminActivityLogs.targetResource,
        oldValue: AdminActivityLogs.oldValue,
        newValue: AdminActivityLogs.newValue,
        reason: AdminActivityLogs.reason,
        createdAt: AdminActivityLogs.createdAt,
        adminName: Users.displayName,
      })
      .from(AdminActivityLogs)
      .leftJoin(Users, eq(AdminActivityLogs.adminId, Users.id))
      .where(eq(AdminActivityLogs.targetUserId, userId))
      .orderBy(desc(AdminActivityLogs.createdAt))
      .limit(20);
    
    // Get tool access requests
    const toolRequests = await db
      .select()
      .from(ToolAccessRequests)
      .where(eq(ToolAccessRequests.userId, userId))
      .orderBy(desc(ToolAccessRequests.createdAt))
      .limit(10);
    
    // Remove sensitive data
    const { passwordHash, mfaSecret, mfaBackupCodes, ...safeUser } = user;
    
    return NextResponse.json({
      success: true,
      user: safeUser,
      sessions,
      roleHistory,
      adminActions,
      toolRequests,
    });
  } catch (error) {
    console.error('[Admin API] Error fetching user details:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
