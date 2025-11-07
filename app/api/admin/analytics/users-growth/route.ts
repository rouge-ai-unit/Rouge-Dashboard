/**
 * API Route: User Growth Analytics
 * Provides user growth data over time for charts
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/middleware/apiAuth';
import { getDb } from '@/utils/dbConfig';
import { Users } from '@/utils/auth-schema';
import { sql, gte } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // Check authorization
    const auth = await requireRole(request, { requiredRole: 'admin' });
    if (!auth.authorized) {
      return auth.response!;
    }
    
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30days'; // 7days, 30days, 90days, 1year
    
    // Calculate date range
    const now = new Date();
    let startDate = new Date();
    let groupBy = 'day';
    
    switch (period) {
      case '7days':
        startDate.setDate(now.getDate() - 7);
        groupBy = 'day';
        break;
      case '30days':
        startDate.setDate(now.getDate() - 30);
        groupBy = 'day';
        break;
      case '90days':
        startDate.setDate(now.getDate() - 90);
        groupBy = 'week';
        break;
      case '1year':
        startDate.setFullYear(now.getFullYear() - 1);
        groupBy = 'month';
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }
    
    // Get user signups grouped by date
    const signupsQuery = await db
      .select({
        date: sql<string>`DATE(${Users.createdAt})`,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(Users)
      .where(gte(Users.createdAt, startDate))
      .groupBy(sql`DATE(${Users.createdAt})`)
      .orderBy(sql`DATE(${Users.createdAt})`);
    
    // Get cumulative user count
    const cumulativeQuery = await db
      .select({
        date: sql<string>`DATE(${Users.createdAt})`,
        cumulative: sql<number>`COUNT(*) OVER (ORDER BY DATE(${Users.createdAt}))::int`,
      })
      .from(Users)
      .where(gte(Users.createdAt, startDate))
      .groupBy(sql`DATE(${Users.createdAt})`)
      .orderBy(sql`DATE(${Users.createdAt})`);
    
    // Format data for charts
    const growthData = signupsQuery.map((item, index) => ({
      date: item.date,
      newUsers: Number(item.count),
      totalUsers: cumulativeQuery[index] ? Number(cumulativeQuery[index].cumulative) : 0,
    }));
    
    // Calculate growth rate
    const previousPeriodStart = new Date(startDate);
    previousPeriodStart.setDate(previousPeriodStart.getDate() - (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    const currentPeriodCount = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(Users)
      .where(gte(Users.createdAt, startDate));
    
    const previousPeriodCount = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(Users)
      .where(
        sql`${Users.createdAt} >= ${previousPeriodStart} AND ${Users.createdAt} < ${startDate}`
      );
    
    const currentCount = Number(currentPeriodCount[0]?.count || 0);
    const previousCount = Number(previousPeriodCount[0]?.count || 0);
    const growthRate = previousCount > 0 
      ? ((currentCount - previousCount) / previousCount) * 100 
      : 100;
    
    return NextResponse.json({
      success: true,
      data: {
        period,
        growthData,
        summary: {
          currentPeriod: currentCount,
          previousPeriod: previousCount,
          growthRate: Math.round(growthRate * 10) / 10,
        },
      },
    });
  } catch (error) {
    console.error('[Admin API] Error fetching user growth analytics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
