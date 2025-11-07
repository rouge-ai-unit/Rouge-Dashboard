/**
 * API Route: Delete User
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/utils/dbConfig';
import { Users } from '@/utils/auth-schema';
import { eq } from 'drizzle-orm';
import { logAdminActivity } from '@/lib/auth/auth-service';

export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Check if user is admin
    const userRole = (session.user as any)?.role;
    const adminId = (session.user as any)?.id;
    
    if (userRole !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }
    
    // Parse request body
    const body = await request.json();
    const { userId } = body;
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    // Prevent admin from deleting themselves
    if (userId === adminId) {
      return NextResponse.json(
        { error: 'You cannot delete your own account' },
        { status: 400 }
      );
    }
    
    // Get IP and user agent
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    const db = getDb();
    
    // Get user details before deletion for logging
    const [user] = await db.select().from(Users).where(eq(Users.id, userId)).limit(1);
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Soft delete by setting deletedAt timestamp
    await db.update(Users)
      .set({
        deletedAt: new Date(),
        status: 'suspended',
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(Users.id, userId));
    
    // Log admin activity
    await logAdminActivity({
      adminId,
      action: 'delete_user',
      targetUserId: userId,
      targetResource: 'user',
      oldValue: {
        email: user.email,
        role: user.role,
        unit: user.unit,
        status: user.status,
      },
      newValue: {
        deletedAt: new Date(),
        status: 'suspended',
      },
      reason: 'User deleted by admin',
      ipAddress,
      userAgent,
    });
    
    return NextResponse.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('[Admin API] Error deleting user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
