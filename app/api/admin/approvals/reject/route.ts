/**
 * API Route: Reject User
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
    const { approvalId, userId, reviewNotes } = body;
    
    if (!approvalId || !userId || !reviewNotes) {
      return NextResponse.json(
        { error: 'Missing required fields. Review notes are required for rejection.' },
        { status: 400 }
      );
    }
    
    // Get IP and user agent
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    // Reject user
    await rejectUser({
      userId,
      approvalId,
      adminId,
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
    notifyUserRejected(userId, reviewNotes).catch(err => {
      console.error('[Reject API] Failed to send notification:', err);
    });
    
    // Send email to user (non-blocking)
    if (user) {
      sendAccountRejectedEmail({
        email: user.email,
        userName: user.displayName || `${user.firstName} ${user.lastName}`,
        reason: reviewNotes,
      }).catch(err => {
        console.error('[Reject API] Failed to send email:', err);
      });
    }
    
    return NextResponse.json({
      success: true,
      message: 'User rejected successfully'
    });
  } catch (error) {
    console.error('[Admin API] Error rejecting user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
