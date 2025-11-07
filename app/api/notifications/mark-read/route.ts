/**
 * API Route: Mark Notification as Read
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { markAsRead, markAllAsRead } from '@/lib/notifications/notification-service';

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
    
    const userId = (session.user as any)?.id;
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID not found' },
        { status: 400 }
      );
    }
    
    // Parse request body
    const body = await request.json();
    const { notificationId, markAll } = body;
    
    if (markAll) {
      // Mark all notifications as read
      const count = await markAllAsRead(userId);
      
      return NextResponse.json({
        success: true,
        message: `Marked ${count} notifications as read`,
        count,
      });
    } else if (notificationId) {
      // Mark single notification as read
      const success = await markAsRead(notificationId);
      
      if (success) {
        return NextResponse.json({
          success: true,
          message: 'Notification marked as read',
        });
      } else {
        return NextResponse.json(
          { error: 'Failed to mark notification as read' },
          { status: 500 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'Either notificationId or markAll must be provided' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('[Notifications API] Error marking as read:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
