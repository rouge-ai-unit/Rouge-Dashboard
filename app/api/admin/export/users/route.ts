/**
 * API Route: Export Users to CSV
 * Exports user data in CSV format
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/middleware/apiAuth';
import { getDb } from '@/utils/dbConfig';
import { Users } from '@/utils/auth-schema';
import { eq, and, desc } from 'drizzle-orm';

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
    let query = db.select().from(Users);
    
    const conditions = [];
    
    if (filters.role && filters.role !== 'all') {
      conditions.push(eq(Users.role, filters.role));
    }
    
    if (filters.unit && filters.unit !== 'all') {
      conditions.push(eq(Users.unit, filters.unit));
    }
    
    if (filters.status && filters.status !== 'all') {
      conditions.push(eq(Users.status, filters.status));
    }
    
    if (filters.isApproved !== undefined) {
      conditions.push(eq(Users.isApproved, filters.isApproved));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    const users = await query.orderBy(desc(Users.createdAt));
    
    // Generate CSV
    const csvHeaders = [
      'ID',
      'Email',
      'First Name',
      'Last Name',
      'Display Name',
      'Role',
      'Unit',
      'Status',
      'Is Approved',
      'Is Active',
      'Created At',
      'Last Login At',
      'Requested Role',
      'Requested Unit',
    ];
    
    const csvRows = users.map(user => [
      user.id,
      user.email,
      user.firstName || '',
      user.lastName || '',
      user.displayName || '',
      user.role || '',
      user.unit || '',
      user.status || '',
      user.isApproved ? 'Yes' : 'No',
      user.isActive ? 'Yes' : 'No',
      user.createdAt ? new Date(user.createdAt).toISOString() : '',
      user.lastLoginAt ? new Date(user.lastLoginAt).toISOString() : '',
      user.requestedRole || '',
      user.requestedUnit || '',
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
        'Content-Disposition': `attachment; filename="users-export-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error('[Admin API] Error exporting users:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
