/**
 * API Route: Approve User
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { approveUser } from '@/lib/auth/auth-service';
import { notifyUserApproved } from '@/lib/notifications/notification-service';
import { sendAccountApprovedEmail } from '@/lib/auth/email-service';
import { getDb } from '@/utils/dbConfig';
import { Users } from '@/utils/auth-schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
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
    const { approvalId, userId, assignedRole, assignedUnit, reviewNotes } = body;
    
    if (!approvalId || !userId || !assignedRole || !assignedUnit) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Get IP and user agent
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    // Approve user
    await approveUser({
      userId,
      approvalId,
      adminId,
      assignedRole,
      assignedUnit,
      reviewNotes,
      ipAddress,
      userAgent,
    });
    
    // Get user details for email
    const db = getDb();
    const [user] = await db
      .select()
      .from(Users)
      .where(eq(Users.id, userId))
      .limit(1);
    
    // Send notification to user (non-blocking)
    notifyUserApproved(userId, adminId).catch(err => {
      console.error('[Approve API] Failed to send notification:', err);
    });
    
    // Send email to user (non-blocking)
    if (user) {
      sendAccountApprovedEmail({
        email: user.email,
        userName: user.displayName || `${user.firstName} ${user.lastName}`,
        assignedRole: assignedRole,
        assignedUnit: assignedUnit,
      }).catch(err => {
        console.error('[Approve API] Failed to send email:', err);
      });
    }
    
    return NextResponse.json({
      success: true,
      message: 'User approved successfully'
    });
  } catch (error) {
    console.error('[Admin API] Error approving user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
