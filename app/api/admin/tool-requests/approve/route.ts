/**
 * API Route: Approve Tool Access Request
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { approveToolAccessRequest } from '@/lib/auth/auth-service';
import { notifyToolAccessGranted } from '@/lib/notifications/notification-service';
import { sendToolAccessGrantedEmail } from '@/lib/auth/email-service';
import { getDb } from '@/utils/dbConfig';
import { ToolAccessRequests, Users } from '@/utils/auth-schema';
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
    const { requestId, reviewNotes } = body;
    
    if (!requestId) {
      return NextResponse.json(
        { error: 'Request ID is required' },
        { status: 400 }
      );
    }
    
    // Get request details before approving
    const db = getDb();
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
    
    // Approve tool access request
    await approveToolAccessRequest({
      requestId,
      adminId,
      reviewNotes,
    });
    
    // Get user details for email
    const [user] = await db
      .select()
      .from(Users)
      .where(eq(Users.id, toolRequest.userId))
      .limit(1);
    
    // Send notification to user (non-blocking)
    notifyToolAccessGranted(
      toolRequest.userId,
      toolRequest.toolName,
      toolRequest.toolPath || '/home'
    ).catch(err => {
      console.error('[Approve Tool API] Failed to send notification:', err);
    });
    
    // Send email to user (non-blocking)
    if (user) {
      sendToolAccessGrantedEmail({
        email: user.email,
        userName: user.displayName || `${user.firstName} ${user.lastName}`,
        toolName: toolRequest.toolName,
        toolPath: toolRequest.toolPath || '/home',
      }).catch(err => {
        console.error('[Approve Tool API] Failed to send email:', err);
      });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Tool access request approved successfully'
    });
  } catch (error) {
    console.error('[Admin API] Error approving tool request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
