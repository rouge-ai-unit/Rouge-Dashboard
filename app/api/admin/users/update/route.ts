/**
 * API Route: Update User
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { changeUserRole } from '@/lib/auth/auth-service';
import { getDb } from '@/utils/dbConfig';
import { Users } from '@/utils/auth-schema';
import { eq } from 'drizzle-orm';
import { sendRoleChangeEmail } from '@/lib/auth/email-service';
import { notifyRoleChanged } from '@/lib/notifications/notification-service';
import { logRoleChange, updateUnitMemberCount } from '@/lib/admin/unit-service';
import { forceLogoutOnRoleChange } from '@/lib/security/session-manager';

export async function PUT(request: NextRequest) {
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
    const { userId, role, unit, status, reason } = body;
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    // Get IP and user agent
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    const db = getDb();
    
    // Get user details before update
    const [user] = await db
      .select()
      .from(Users)
      .where(eq(Users.id, userId))
      .limit(1);
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    const oldRole = user.role;
    const oldUnit = user.unit;
    
    // Update user role if changed
    if (role && role !== oldRole) {
      await changeUserRole({
        userId,
        adminId,
        newRole: role,
        newUnit: unit,
        reason,
        ipAddress,
        userAgent,
      });
      
      // Log role change to history
      await logRoleChange({
        userId,
        changedBy: adminId,
        oldRole: oldRole || 'member',
        newRole: role,
        oldUnit: oldUnit || undefined,
        newUnit: unit || undefined,
        reason,
        ipAddress,
        userAgent,
      }).catch(err => console.error('Failed to log role change:', err));
      
      // Update unit member counts
      if (oldUnit && oldUnit !== unit) {
        await updateUnitMemberCount(oldUnit).catch(err => console.error('Failed to update old unit count:', err));
      }
      if (unit) {
        await updateUnitMemberCount(unit).catch(err => console.error('Failed to update new unit count:', err));
      }
      
      // Force logout on role change for security (revoke all sessions)
      await forceLogoutOnRoleChange(userId, oldRole || 'member', role).catch(err => {
        console.error('Failed to force logout on role change:', err);
      });
      
      // Get admin details
      const [admin] = await db
        .select()
        .from(Users)
        .where(eq(Users.id, adminId))
        .limit(1);
      
      const adminName = admin ? (admin.displayName || `${admin.firstName} ${admin.lastName}`) : 'Admin';
      
      // Send email notification (non-blocking)
      sendRoleChangeEmail({
        email: user.email,
        userName: user.displayName || `${user.firstName} ${user.lastName}`,
        oldRole: oldRole || 'member',
        newRole: role,
        changedBy: adminName,
      }).catch(err => {
        console.error('[User Update API] Failed to send role change email:', err);
      });
      
      // Send in-app notification (non-blocking)
      notifyRoleChanged(userId, oldRole || 'member', role, adminId).catch(err => {
        console.error('[User Update API] Failed to send role change notification:', err);
      });
    }
    
    // Update status if provided
    if (status) {
      await db.update(Users)
        .set({
          status,
          updatedAt: new Date(),
        })
        .where(eq(Users.id, userId));
    }
    
    return NextResponse.json({
      success: true,
      message: 'User updated successfully'
    });
  } catch (error) {
    console.error('[Admin API] Error updating user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
