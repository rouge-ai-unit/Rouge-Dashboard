/**
 * API Route: Export Activity Logs to CSV
 * Exports admin activity logs in CSV format
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/middleware/apiAuth';
import { getDb } from '@/utils/dbConfig';
import { AdminActivityLogs, Users } from '@/utils/auth-schema';
import { eq, desc, and, gte, lte } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    // Check authorization
    const auth = await requireRole(request, { requiredRole: 'admin' });
    if (!auth.authorized) {
      return auth.response!;
    }
    
    const db = getDb();
    const body = await request.json();
    const { filters = {} } = body;
    
    // Build query with filters
    let query = db
      .select({
        log: AdminActivityLogs,
        adminName: Users.displayName,
        adminEmail: Users.email,
      })
      .from(AdminActivityLogs)
      .leftJoin(Users, eq(AdminActivityLogs.adminId, Users.id));
    
    const conditions = [];
    
    if (filters.adminId) {
      conditions.push(eq(AdminActivityLogs.adminId, filters.adminId));
    }
    
    if (filters.action) {
      conditions.push(eq(AdminActivityLogs.action, filters.action));
    }
    
    if (filters.startDate) {
      conditions.push(gte(AdminActivityLogs.createdAt, new Date(filters.startDate)));
    }
    
    if (filters.endDate) {
      conditions.push(lte(AdminActivityLogs.createdAt, new Date(filters.endDate)));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    const logs = await query.orderBy(desc(AdminActivityLogs.createdAt));
    
    // Generate CSV
    const csvHeaders = [
      'ID',
      'Admin Name',
      'Admin Email',
      'Action',
      'Target Resource',
      'Target User ID',
      'Old Value',
      'New Value',
      'Reason',
      'IP Address',
      'Created At',
    ];
    
    const csvRows = logs.map(({ log, adminName, adminEmail }) => [
      log.id,
      adminName || '',
      adminEmail || '',
      log.action,
      log.targetResource || '',
      log.targetUserId || '',
      log.oldValue ? JSON.stringify(log.oldValue) : '',
      log.newValue ? JSON.stringify(log.newValue) : '',
      log.reason || '',
      log.ipAddress || '',
      log.createdAt ? new Date(log.createdAt).toISOString() : '',
    ]);
    
    // Escape CSV values
    const escapeCsvValue = (value: any): string => {
      if (value === null || value === undefined) return '';
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    };
    
    const csvContent = [
      csvHeaders.map(escapeCsvValue).join(','),
      ...csvRows.map(row => row.map(escapeCsvValue).join(','))
    ].join('\n');
    
    // Return CSV file
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="activity-logs-export-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error('[Admin API] Error exporting activity logs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
