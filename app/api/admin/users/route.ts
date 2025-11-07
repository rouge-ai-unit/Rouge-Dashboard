/**
 * API Route: Get All Users
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/middleware/apiAuth';
import { getDb } from '@/utils/dbConfig';
import { Users } from '@/utils/auth-schema';

export async function GET(request: NextRequest) {
  try {
    // Check authorization
    const auth = await requireRole(request, { requiredRole: 'admin' });
    if (!auth.authorized) {
      return auth.response!;
    }
    
    // Get all users
    const db = getDb();
    const users = await db.select({
      id: Users.id,
      email: Users.email,
      firstName: Users.firstName,
      lastName: Users.lastName,
      displayName: Users.displayName,
      role: Users.role,
      unit: Users.unit,
      status: Users.status,
      isApproved: Users.isApproved,
      createdAt: Users.createdAt,
      lastLoginAt: Users.lastLoginAt,
    }).from(Users);
    
    return NextResponse.json({
      success: true,
      users: users
    });
  } catch (error) {
    console.error('[Admin API] Error fetching users:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
