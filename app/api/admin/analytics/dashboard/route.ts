/**
 * API Route: Dashboard Analytics
 * Real-time dashboard statistics and metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/middleware/apiAuth';
import { getDb } from '@/utils/dbConfig';
import { Users, UserApprovalQueue, ToolAccessRequests, AdminActivityLogs, Sessions } from '@/utils/auth-schema';
import { eq, and, gte, count, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // Check authorization
    const auth = await requireRole(request, { requiredRole: 'admin' });
    if (!auth.authorized) {
      return auth.response!;
    }
    
    const db = getDb();
    
    // Get current date ranges
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Parallel fetch all statistics
    const [
      totalUsersResult,
      activeUsersResult,
      pendingApprovalsResult,
      pendingToolRequestsResult,
      newUsersThisWeekResult,
      newUsersThisMonthResult,
      activeSessionsResult,
      recentActivityResult,
      usersByRoleResult,
      usersByUnitResult,
      usersByStatusResult,
    ] = await Promise.all([
      // Total users
      db.select({ count: count() }).from(Users),
      
      // Active users
      db.select({ count: count() }).from(Users).where(
        and(
          eq(Users.isActive, true),
          eq(Users.status, 'active')
        )
      ),
      
      // Pending approvals
      db.select({ count: count() }).from(UserApprovalQueue).where(
        eq(UserApprovalQueue.status, 'pending')
      ),
      
      // Pending tool requests
      db.select({ count: count() }).from(ToolAccessRequests).where(
        eq(ToolAccessRequests.status, 'pending')
      ),
      
      // New users this week
      db.select({ count: count() }).from(Users).where(
        gte(Users.createdAt, thisWeek)
      ),
      
      // New users this month
      db.select({ count: count() }).from(Users).where(
        gte(Users.createdAt, thisMonth)
      ),
      
      // Active sessions
      db.select({ count: count() }).from(Sessions).where(
        and(
          eq(Sessions.isActive, true),
          gte(Sessions.expiresAt, now)
        )
      ),
      
      // Recent admin activity (last 10)
      db.select({
        id: AdminActivityLogs.id,
        action: AdminActivityLogs.action,
        targetResource: AdminActivityLogs.targetResource,
        createdAt: AdminActivityLogs.createdAt,
        adminName: Users.displayName,
      })
        .from(AdminActivityLogs)
        .leftJoin(Users, eq(AdminActivityLogs.adminId, Users.id))
        .orderBy(sql`${AdminActivityLogs.createdAt} DESC`)
        .limit(10),
      
      // Users by role
      db.select({
        role: Users.role,
        count: count(),
      })
        .from(Users)
        .where(eq(Users.isActive, true))
        .groupBy(Users.role),
      
      // Users by unit
      db.select({
        unit: Users.unit,
        count: count(),
      })
        .from(Users)
        .where(
          and(
            eq(Users.isActive, true),
            sql`${Users.unit} IS NOT NULL`
          )
        )
        .groupBy(Users.unit),
      
      // Users by status
      db.select({
        status: Users.status,
        count: count(),
      })
        .from(Users)
        .groupBy(Users.status),
    ]);
    
    // Format the response
    const analytics = {
      overview: {
        totalUsers: Number(totalUsersResult[0]?.count || 0),
        activeUsers: Number(activeUsersResult[0]?.count || 0),
        pendingApprovals: Number(pendingApprovalsResult[0]?.count || 0),
        pendingToolRequests: Number(pendingToolRequestsResult[0]?.count || 0),
        pendingToolAccessRequests: Number(pendingToolRequestsResult[0]?.count || 0), // Tool access requests (same as pendingToolRequests for now)
        activeSessions: Number(activeSessionsResult[0]?.count || 0),
      },
      growth: {
        newUsersThisWeek: Number(newUsersThisWeekResult[0]?.count || 0),
        newUsersThisMonth: Number(newUsersThisMonthResult[0]?.count || 0),
      },
      distribution: {
        byRole: usersByRoleResult.map(r => ({
          role: r.role || 'unknown',
          count: Number(r.count),
        })),
        byUnit: usersByUnitResult.map(u => ({
          unit: u.unit || 'unknown',
          count: Number(u.count),
        })),
        byStatus: usersByStatusResult.map(s => ({
          status: s.status || 'unknown',
          count: Number(s.count),
        })),
      },
      recentActivity: recentActivityResult.map(activity => ({
        id: activity.id,
        action: activity.action,
        targetResource: activity.targetResource,
        adminName: activity.adminName,
        createdAt: activity.createdAt,
      })),
      timestamp: new Date().toISOString(),
    };
    
    return NextResponse.json({
      success: true,
      analytics,
    });
  } catch (error) {
    console.error('[Admin API] Error fetching dashboard analytics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
