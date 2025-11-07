/**
 * API Route: Get Admin Emails
 * Returns list of admin emails for support contact
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/utils/dbConfig';
import { Users } from '@/utils/auth-schema';
import { eq, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    
    // Get all active admin emails
    const admins = await db
      .select({
        email: Users.email,
        name: Users.displayName,
      })
      .from(Users)
      .where(
        and(
          eq(Users.role, 'admin'),
          eq(Users.isActive, true),
          eq(Users.isApproved, true)
        )
      )
      .orderBy(Users.email);
    
    return NextResponse.json({
      success: true,
      admins,
      primaryEmail: admins[0]?.email || null,
    });
  } catch (error) {
    console.error('[Public API] Error fetching admin emails:', error);
    return NextResponse.json(
      { 
        success: false,
        admins: [],
        primaryEmail: null
      },
      { status: 200 } // Return 200 with fallback instead of error
    );
  }
}
