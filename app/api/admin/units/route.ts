/**
 * API Route: Unit Management
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/middleware/apiAuth';
import { getAllUnits, createUnit } from '@/lib/admin/unit-service';

export async function GET(request: NextRequest) {
  try {
    // Check authorization
    const auth = await requireRole(request, { requiredRole: 'admin' });
    if (!auth.authorized) {
      return auth.response!;
    }
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';
    
    // Get all units
    const units = await getAllUnits(includeInactive);
    
    return NextResponse.json({
      success: true,
      units,
      count: units.length,
    });
  } catch (error) {
    console.error('[Admin API] Error fetching units:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authorization
    const auth = await requireRole(request, { requiredRole: 'admin' });
    if (!auth.authorized) {
      return auth.response!;
    }
    
    // Parse request body
    const body = await request.json();
    const { name, description, code, leaderId, coLeaderId, color, icon } = body;
    
    // Validation
    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Unit name is required' },
        { status: 400 }
      );
    }
    
    // Create unit
    const unit = await createUnit({
      name: name.trim(),
      description,
      code,
      leaderId,
      coLeaderId,
      color,
      icon,
      createdBy: auth.userId!,
    });
    
    return NextResponse.json({
      success: true,
      unit,
      message: 'Unit created successfully',
    }, { status: 201 });
  } catch (error: any) {
    console.error('[Admin API] Error creating unit:', error);
    
    if (error.message?.includes('unique')) {
      return NextResponse.json(
        { error: 'Unit name or code already exists' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
