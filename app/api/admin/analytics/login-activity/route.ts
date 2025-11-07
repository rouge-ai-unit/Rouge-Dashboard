/**
 * API Route: Login Activity Analytics
 * Provides login activity data and patterns
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/middleware/apiAuth';
import { getDb } from '@/utils/dbConfig';
import { AuditLogs, Users } from '@/utils/auth-schema';
import { sql, eq, and, gte, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // Check authorization
    const auth = await requireRole(request, { requiredRole: 'admin' });
    if (!auth.authorized) {
      return auth.response!;
    }
    
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '7days';
    
    // Calculate date range
    const now = new Date();
    let startDate = new Date();
    
    switch (period) {
      case '7days':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30days':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90days':
        startDate.setDate(now.getDate() - 90);
        break;
      default:
        startDate.setDate(now.getDate() - 7);
    }
    
    // Get login attempts by date
    const loginsByDate = await db
      .select({
        date: sql<string>`DATE(${AuditLogs.createdAt})`,
        successful: sql<number>`COUNT(*) FILTER (WHERE ${AuditLogs.eventStatus} = 'success')::int`,
        failed: sql<number>`COUNT(*) FILTER (WHERE ${AuditLogs.eventStatus} = 'failure')::int`,
      })
      .from(AuditLogs)
      .where(
        and(
          eq(AuditLogs.eventType, 'login_attempt'),
          gte(AuditLogs.createdAt, startDate)
        )
      )
      .groupBy(sql`DATE(${AuditLogs.createdAt})`)
      .orderBy(sql`DATE(${AuditLogs.createdAt})`);
    
    // Get recent failed login attempts
    const recentFailedLogins = await db
      .select({
        id: AuditLogs.id,
        email: AuditLogs.email,
        ipAddress: AuditLogs.ipAddress,
        errorMessage: AuditLogs.errorMessage,
        createdAt: AuditLogs.createdAt,
      })
      .from(AuditLogs)
      .where(
        and(
          eq(AuditLogs.eventType, 'login_attempt'),
          eq(AuditLogs.eventStatus, 'failure'),
          gte(AuditLogs.createdAt, startDate)
        )
      )
      .orderBy(desc(AuditLogs.createdAt))
      .limit(20);
    
    // Get login activity by hour of day
    const loginsByHour = await db
      .select({
        hour: sql<number>`EXTRACT(HOUR FROM ${AuditLogs.createdAt})::int`,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(AuditLogs)
      .where(
        and(
          eq(AuditLogs.eventType, 'login_attempt'),
          eq(AuditLogs.eventStatus, 'success'),
          gte(AuditLogs.createdAt, startDate)
        )
      )
      .groupBy(sql`EXTRACT(HOUR FROM ${AuditLogs.createdAt})`)
      .orderBy(sql`EXTRACT(HOUR FROM ${AuditLogs.createdAt})`);
    
    // Get most active users
    const mostActiveUsers = await db
      .select({
        userId: AuditLogs.userId,
        email: AuditLogs.email,
        loginCount: sql<number>`COUNT(*)::int`,
        lastLogin: sql<string>`MAX(${AuditLogs.createdAt})`,
      })
      .from(AuditLogs)
      .where(
        and(
          eq(AuditLogs.eventType, 'login_attempt'),
          eq(AuditLogs.eventStatus, 'success'),
          gte(AuditLogs.createdAt, startDate)
        )
      )
      .groupBy(AuditLogs.userId, AuditLogs.email)
      .orderBy(desc(sql`COUNT(*)`))
      .limit(10);
    
    // Calculate summary statistics
    const totalLogins = loginsByDate.reduce((sum, day) => sum + Number(day.successful), 0);
    const totalFailedLogins = loginsByDate.reduce((sum, day) => sum + Number(day.failed), 0);
    const successRate = totalLogins + totalFailedLogins > 0
      ? (totalLogins / (totalLogins + totalFailedLogins)) * 100
      : 100;
    
    return NextResponse.json({
      success: true,
      data: {
        period,
        loginsByDate: loginsByDate.map(item => ({
          date: item.date,
          successful: Number(item.successful),
          failed: Number(item.failed),
        })),
        loginsByHour: loginsByHour.map(item => ({
          hour: Number(item.hour),
          count: Number(item.count),
        })),
        recentFailedLogins: recentFailedLogins.map(item => ({
          id: item.id,
          email: item.email,
          ipAddress: item.ipAddress,
          errorMessage: item.errorMessage,
          createdAt: item.createdAt,
        })),
        mostActiveUsers: mostActiveUsers.map(item => ({
          userId: item.userId,
          email: item.email,
          loginCount: Number(item.loginCount),
          lastLogin: item.lastLogin,
        })),
        summary: {
          totalLogins,
          totalFailedLogins,
          successRate: Math.round(successRate * 10) / 10,
        },
      },
    });
  } catch (error) {
    console.error('[Admin API] Error fetching login activity analytics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
