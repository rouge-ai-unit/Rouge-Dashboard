/**
 * API Route: Get All Permissions
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/middleware/apiAuth';
import { getDb } from '@/utils/dbConfig';
import { RolePermissions } from '@/utils/auth-schema';

export async function GET(request: NextRequest) {
  try {
    // Check authorization
    const auth = await requireRole(request, { requiredRole: 'admin' });
    if (!auth.authorized) {
      return auth.response!;
    }
    
    // Get all permissions
    const db = getDb();
    const permissions = await db.select().from(RolePermissions);
    
    return NextResponse.json({
      success: true,
      permissions: permissions
    });
  } catch (error) {
    console.error('[Admin API] Error fetching permissions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
