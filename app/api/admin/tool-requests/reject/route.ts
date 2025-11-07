/**
 * API Route: Reject Tool Access Request
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/utils/dbConfig';
import { ToolAccessRequests, Users } from '@/utils/auth-schema';
import { eq } from 'drizzle-orm';
import { logAdminActivity } from '@/lib/auth/auth-service';
import { notifyToolAccessDenied } from '@/lib/notifications/notification-service';
import { sendToolAccessDeniedEmail } from '@/lib/auth/email-service';

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
    const { requestId, reviewNotes } = body;
    
    if (!requestId || !reviewNotes) {
      return NextResponse.json(
        { error: 'Request ID and review notes are required' },
        { status: 400 }
      );
    }
    
    // Get IP and user agent
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    const db = getDb();
    
    // Get request details
    const [toolRequest] = await db
      .select()
      .from(ToolAccessRequests)
      .where(eq(ToolAccessRequests.id, requestId))
      .limit(1);
    
    if (!toolRequest) {
      return NextResponse.json(
        { error: 'Tool request not found' },
        { status: 404 }
      );
    }
    
    // Update request status
    await db.update(ToolAccessRequests)
      .set({
        status: 'rejected',
        reviewedBy: adminId,
        reviewedAt: new Date(),
        reviewNotes,
        updatedAt: new Date(),
      })
      .where(eq(ToolAccessRequests.id, requestId));
    
    // Log admin activity
    await logAdminActivity({
      adminId,
      action: 'reject_tool_access',
      targetUserId: toolRequest.userId,
      targetResource: toolRequest.toolName,
      oldValue: { status: 'pending' },
      newValue: { status: 'rejected' },
      reason: reviewNotes,
      ipAddress,
      userAgent,
    });
    
    // Get user details for email
    const [user] = await db
      .select()
      .from(Users)
      .where(eq(Users.id, toolRequest.userId))
      .limit(1);
    
    // Send notification to user (non-blocking)
    notifyToolAccessDenied(
      toolRequest.userId,
      toolRequest.toolName,
      reviewNotes
    ).catch(err => {
      console.error('[Reject Tool API] Failed to send notification:', err);
    });
    
    // Send email to user (non-blocking)
    if (user) {
      sendToolAccessDeniedEmail({
        email: user.email,
        userName: user.displayName || `${user.firstName} ${user.lastName}`,
        toolName: toolRequest.toolName,
        reason: reviewNotes,
      }).catch(err => {
        console.error('[Reject Tool API] Failed to send email:', err);
      });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Tool access request rejected successfully'
    });
  } catch (error) {
    console.error('[Admin API] Error rejecting tool request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
