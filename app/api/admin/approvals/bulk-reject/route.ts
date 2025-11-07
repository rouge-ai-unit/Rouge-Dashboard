/**
 * API Route: Bulk Reject Users
 * Reject multiple users at once
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { rejectUser } from '@/lib/auth/auth-service';
import { notifyUserRejected } from '@/lib/notifications/notification-service';
import { sendAccountRejectedEmail } from '@/lib/auth/email-service';
import { getDb } from '@/utils/dbConfig';
import { Users } from '@/utils/auth-schema';
import { eq } from 'drizzle-orm';

interface BulkRejectionRequest {
  approvalId: string;
  userId: string;
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
    const { rejections, reviewNotes } = body as {
      rejections: BulkRejectionRequest[];
      reviewNotes: string;
    };
    
    if (!rejections || !Array.isArray(rejections) || rejections.length === 0) {
      return NextResponse.json(
        { error: 'No rejections provided' },
        { status: 400 }
      );
    }
    
    if (!reviewNotes || reviewNotes.trim().length === 0) {
      return NextResponse.json(
        { error: 'Review notes are required for bulk rejection' },
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
    
    // Process each rejection
    for (const rejection of rejections) {
      try {
        // Reject user
        await rejectUser({
          userId: rejection.userId,
          approvalId: rejection.approvalId,
          adminId,
          reviewNotes,
          ipAddress,
          userAgent,
        });
        
        // Get user details for email
        const [user] = await db
          .select()
          .from(Users)
          .where(eq(Users.id, rejection.userId))
          .limit(1);
        
        if (user) {
          // Send notification (non-blocking)
          notifyUserRejected(rejection.userId, reviewNotes).catch(err => {
            console.error('[Bulk Reject API] Failed to send notification:', err);
          });
          
          // Send email (non-blocking)
          sendAccountRejectedEmail({
            email: user.email,
            userName: user.displayName || `${user.firstName} ${user.lastName}`,
            reason: reviewNotes,
          }).catch(err => {
            console.error('[Bulk Reject API] Failed to send email:', err);
          });
        }
        
        results.successful.push(rejection.userId);
      } catch (error: any) {
        console.error(`[Bulk Reject API] Error rejecting user ${rejection.userId}:`, error);
        results.failed.push({
          userId: rejection.userId,
          error: error.message || 'Unknown error',
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Rejected ${results.successful.length} of ${rejections.length} users`,
      results,
    });
  } catch (error) {
    console.error('[Admin API] Error in bulk reject:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
