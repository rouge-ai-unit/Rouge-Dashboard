/**
 * API Route: Failed Logins Security Data
 * Provides security analytics for failed login attempts
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
    
    // Get failed login attempts
    const failedLogins = await db
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
      .limit(100);
    
    // Calculate statistics
    const uniqueIPs = new Set(failedLogins.map(l => l.ipAddress).filter(Boolean)).size;
    
    // Count suspicious activity (5+ failed attempts from same IP)
    const ipCounts = failedLogins.reduce((acc, login) => {
      if (login.ipAddress) {
        acc[login.ipAddress] = (acc[login.ipAddress] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);
    
    const suspiciousActivity = Object.values(ipCounts).filter(count => count >= 5).length;
    
    // Get locked accounts count
    const lockedAccounts = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(Users)
      .where(eq(Users.status, 'locked'));
    
    return NextResponse.json({
      success: true,
      failedLogins: failedLogins.map(login => ({
        id: login.id,
        email: login.email,
        ipAddress: login.ipAddress,
        errorMessage: login.errorMessage,
        createdAt: login.createdAt,
      })),
      stats: {
        totalFailedLogins: failedLogins.length,
        uniqueIPs,
        suspiciousActivity,
        lockedAccounts: Number(lockedAccounts[0]?.count || 0),
      },
    });
  } catch (error) {
    console.error('[Admin API] Error fetching security data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
