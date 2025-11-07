/**
 * API Route: Bulk Approve Users
 * Approve multiple users at once
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

interface BulkApprovalRequest {
  approvalId: string;
  userId: string;
  assignedRole: string;
  assignedUnit: string;
}

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
    const { approvals, reviewNotes } = body as {
      approvals: BulkApprovalRequest[];
      reviewNotes?: string;
    };
    
    if (!approvals || !Array.isArray(approvals) || approvals.length === 0) {
      return NextResponse.json(
        { error: 'No approvals provided' },
        { status: 400 }
      );
    }
    
    // Get IP and user agent
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    const db = getDb();
    const results = {
      successful: [] as string[],
      failed: [] as { userId: string; error: string }[],
    };
    
    // Process each approval
    for (const approval of approvals) {
      try {
        // Approve user
        await approveUser({
          userId: approval.userId,
          approvalId: approval.approvalId,
          adminId,
          assignedRole: approval.assignedRole,
          assignedUnit: approval.assignedUnit,
          reviewNotes: reviewNotes || 'Bulk approval',
          ipAddress,
          userAgent,
        });
        
        // Get user details for email
        const [user] = await db
          .select()
          .from(Users)
          .where(eq(Users.id, approval.userId))
          .limit(1);
        
        if (user) {
          // Send notification (non-blocking)
          notifyUserApproved(approval.userId, adminId).catch(err => {
            console.error('[Bulk Approve API] Failed to send notification:', err);
          });
          
          // Send email (non-blocking)
          sendAccountApprovedEmail({
            email: user.email,
            userName: user.displayName || `${user.firstName} ${user.lastName}`,
            assignedRole: approval.assignedRole,
            assignedUnit: approval.assignedUnit,
          }).catch(err => {
            console.error('[Bulk Approve API] Failed to send email:', err);
          });
        }
        
        results.successful.push(approval.userId);
      } catch (error: any) {
        console.error(`[Bulk Approve API] Error approving user ${approval.userId}:`, error);
        results.failed.push({
          userId: approval.userId,
          error: error.message || 'Unknown error',
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Approved ${results.successful.length} of ${approvals.length} users`,
      results,
    });
  } catch (error) {
    console.error('[Admin API] Error in bulk approve:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
