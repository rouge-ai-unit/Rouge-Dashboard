/**
 * API Route: Public Units List
 * Get all active units (no admin auth required)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/utils/dbConfig';
import { Units } from '@/utils/auth-schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    
    // Get all active units
    const units = await db
      .select({
        id: Units.id,
        name: Units.name,
        description: Units.description,
        code: Units.code,
        color: Units.color,
        icon: Units.icon,
      })
      .from(Units)
      .where(eq(Units.isActive, true))
      .orderBy(Units.name);
    
    return NextResponse.json({
      success: true,
      units,
    });
  } catch (error) {
    console.error('[Public Units API] Error fetching units:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
