/**
 * API Route: Single Unit Management
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/middleware/apiAuth';
import { getUnitById, updateUnit, deleteUnit } from '@/lib/admin/unit-service';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authorization
    const auth = await requireRole(request, { requiredRole: 'admin' });
    if (!auth.authorized) {
      return auth.response!;
    }
    
    const unit = await getUnitById(params.id);
    
    if (!unit) {
      return NextResponse.json(
        { error: 'Unit not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      unit,
    });
  } catch (error) {
    console.error('[Admin API] Error fetching unit:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authorization
    const auth = await requireRole(request, { requiredRole: 'admin' });
    if (!auth.authorized) {
      return auth.response!;
    }
    
    // Parse request body
    const body = await request.json();
    
    // Update unit
    const unit = await updateUnit(params.id, body);
    
    return NextResponse.json({
      success: true,
      unit,
      message: 'Unit updated successfully',
    });
  } catch (error) {
    console.error('[Admin API] Error updating unit:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authorization
    const auth = await requireRole(request, { requiredRole: 'admin' });
    if (!auth.authorized) {
      return auth.response!;
    }
    
    await deleteUnit(params.id);
    
    return NextResponse.json({
      success: true,
      message: 'Unit deleted successfully',
    });
  } catch (error: any) {
    console.error('[Admin API] Error deleting unit:', error);
    
    if (error.message?.includes('members')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
