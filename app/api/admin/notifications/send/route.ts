/**
 * API Route: Send Notifications
 * Allows admins to send notifications to users
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/middleware/apiAuth';
import { getDb } from '@/utils/dbConfig';
import { Users } from '@/utils/auth-schema';
import { eq, and } from 'drizzle-orm';
import { createNotification } from '@/lib/notifications/notification-service';

export async function POST(request: NextRequest) {
  try {
    // Check authorization
    const auth = await requireRole(request, { requiredRole: 'admin' });
    if (!auth.authorized) {
      return auth.response!;
    }
    
    const db = getDb();
    const body = await request.json();
    
    const {
      recipientType,
      specificUserId,
      notificationType,
      priority,
      title,
      message,
      actionUrl,
      actionLabel,
    } = body;
    
    // Validate required fields
    if (!title || !message) {
      return NextResponse.json(
        { error: 'Title and message are required' },
        { status: 400 }
      );
    }
    
    // Get recipients based on type
    let recipients: any[] = [];
    
    switch (recipientType) {
      case 'all_users':
        recipients = await db
          .select({ id: Users.id })
          .from(Users)
          .where(
            and(
              eq(Users.isActive, true),
              eq(Users.isApproved, true)
            )
          );
        break;
        
      case 'all_admins':
        recipients = await db
          .select({ id: Users.id })
          .from(Users)
          .where(
            and(
              eq(Users.role, 'admin'),
              eq(Users.isActive, true),
              eq(Users.isApproved, true)
            )
          );
        break;
        
      case 'all_leaders':
        recipients = await db
          .select({ id: Users.id })
          .from(Users)
          .where(
            and(
              eq(Users.role, 'leader'),
              eq(Users.isActive, true),
              eq(Users.isApproved, true)
            )
          );
        break;
        
      case 'all_members':
        recipients = await db
          .select({ id: Users.id })
          .from(Users)
          .where(
            and(
              eq(Users.role, 'member'),
              eq(Users.isActive, true),
              eq(Users.isApproved, true)
            )
          );
        break;
        
      case 'specific_user':
        if (!specificUserId) {
          return NextResponse.json(
            { error: 'User ID or email is required for specific user' },
            { status: 400 }
          );
        }
        
        // Check if it's an email or ID
        const isEmail = specificUserId.includes('@');
        const user = isEmail
          ? await db.select({ id: Users.id }).from(Users).where(eq(Users.email, specificUserId)).limit(1)
          : await db.select({ id: Users.id }).from(Users).where(eq(Users.id, specificUserId)).limit(1);
        
        if (user.length === 0) {
          return NextResponse.json(
            { error: 'User not found' },
            { status: 404 }
          );
        }
        
        recipients = user;
        break;
        
      default:
        return NextResponse.json(
          { error: 'Invalid recipient type' },
          { status: 400 }
        );
    }
    
    if (recipients.length === 0) {
      return NextResponse.json(
        { error: 'No recipients found' },
        { status: 404 }
      );
    }
    
    // Create notifications for all recipients
    let successCount = 0;
    let failCount = 0;
    
    for (const recipient of recipients) {
      try {
        await createNotification({
          userId: recipient.id,
          type: notificationType || 'general',
          title,
          message,
          actionUrl: actionUrl || undefined,
          actionLabel: actionLabel || undefined,
          priority: priority || 'normal',
          relatedUserId: auth.userId,
        });
        successCount++;
      } catch (error) {
        console.error(`Failed to create notification for user ${recipient.id}:`, error);
        failCount++;
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Notification sent to ${successCount} user(s)${failCount > 0 ? `, ${failCount} failed` : ''}`,
      stats: {
        total: recipients.length,
        successful: successCount,
        failed: failCount,
      },
    });
  } catch (error) {
    console.error('[Admin API] Error sending notifications:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
