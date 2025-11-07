/**
 * Notification Service
 * Handles creating, sending, and managing notifications
 */

import { getDb } from '@/utils/dbConfig';
import { Notifications, Users } from '@/utils/auth-schema';
import { eq, and, desc } from 'drizzle-orm';

export type NotificationType = 
  | 'user_approved'
  | 'user_rejected'
  | 'role_changed'
  | 'tool_access_granted'
  | 'tool_access_denied'
  | 'new_signup'
  | 'new_tool_request'
  | 'security_alert'
  | 'system_error'
  | 'password_reset'
  | 'account_locked';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedUserId?: string;
  relatedResourceType?: string;
  relatedResourceId?: string;
  actionUrl?: string;
  actionLabel?: string;
  priority?: NotificationPriority;
  metadata?: Record<string, any>;
  expiresAt?: Date;
}

/**
 * Create a notification for a user
 */
export async function createNotification(params: CreateNotificationParams): Promise<string> {
  try {
    const db = getDb();
    
    const [notification] = await db.insert(Notifications).values({
      userId: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      relatedUserId: params.relatedUserId,
      relatedResourceType: params.relatedResourceType,
      relatedResourceId: params.relatedResourceId,
      actionUrl: params.actionUrl,
      actionLabel: params.actionLabel,
      priority: params.priority || 'normal',
      metadata: params.metadata,
      expiresAt: params.expiresAt,
      isRead: false,
      createdAt: new Date(),
    }).returning({ id: Notifications.id });
    
    console.log(`[Notification] Created notification ${notification.id} for user ${params.userId}`);
    
    return notification.id;
  } catch (error) {
    console.error('[Notification Service] Error creating notification:', error);
    throw error;
  }
}

/**
 * Create notifications for all admins
 */
export async function notifyAdmins(params: Omit<CreateNotificationParams, 'userId'>): Promise<number> {
  try {
    const db = getDb();
    
    // Get all admin users
    const admins = await db
      .select({ id: Users.id })
      .from(Users)
      .where(
        and(
          eq(Users.role, 'admin'),
          eq(Users.isActive, true),
          eq(Users.isApproved, true)
        )
      );
    
    // Create notification for each admin
    let count = 0;
    for (const admin of admins) {
      await createNotification({
        ...params,
        userId: admin.id,
      });
      count++;
    }
    
    console.log(`[Notification] Created ${count} admin notifications`);
    
    return count;
  } catch (error) {
    console.error('[Notification Service] Error notifying admins:', error);
    return 0;
  }
}

/**
 * Get notifications for a user
 */
export async function getUserNotifications(
  userId: string,
  options?: {
    limit?: number;
    unreadOnly?: boolean;
  }
): Promise<any[]> {
  try {
    const db = getDb();
    
    const conditions = [eq(Notifications.userId, userId)];
    
    if (options?.unreadOnly) {
      conditions.push(eq(Notifications.isRead, false));
    }
    
    const notifications = await db
      .select()
      .from(Notifications)
      .where(and(...conditions))
      .orderBy(desc(Notifications.createdAt))
      .limit(options?.limit || 50);
    
    return notifications;
  } catch (error) {
    console.error('[Notification Service] Error getting notifications:', error);
    return [];
  }
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadCount(userId: string): Promise<number> {
  try {
    const db = getDb();
    
    const notifications = await db
      .select()
      .from(Notifications)
      .where(
        and(
          eq(Notifications.userId, userId),
          eq(Notifications.isRead, false)
        )
      );
    
    return notifications.length;
  } catch (error) {
    console.error('[Notification Service] Error getting unread count:', error);
    return 0;
  }
}

/**
 * Mark notification as read
 */
export async function markAsRead(notificationId: string): Promise<boolean> {
  try {
    const db = getDb();
    
    await db
      .update(Notifications)
      .set({
        isRead: true,
        readAt: new Date(),
      })
      .where(eq(Notifications.id, notificationId));
    
    return true;
  } catch (error) {
    console.error('[Notification Service] Error marking as read:', error);
    return false;
  }
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllAsRead(userId: string): Promise<number> {
  try {
    const db = getDb();
    
    const unreadNotifications = await db
      .select()
      .from(Notifications)
      .where(
        and(
          eq(Notifications.userId, userId),
          eq(Notifications.isRead, false)
        )
      );
    
    for (const notification of unreadNotifications) {
      await db
        .update(Notifications)
        .set({
          isRead: true,
          readAt: new Date(),
        })
        .where(eq(Notifications.id, notification.id));
    }
    
    return unreadNotifications.length;
  } catch (error) {
    console.error('[Notification Service] Error marking all as read:', error);
    return 0;
  }
}

/**
 * Delete old read notifications
 */
export async function cleanupOldNotifications(daysOld: number = 30): Promise<number> {
  try {
    const db = getDb();
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    const oldNotifications = await db
      .select()
      .from(Notifications)
      .where(
        and(
          eq(Notifications.isRead, true)
        )
      );
    
    let deleted = 0;
    for (const notification of oldNotifications) {
      if (notification.readAt && notification.readAt < cutoffDate) {
        await db
          .delete(Notifications)
          .where(eq(Notifications.id, notification.id));
        deleted++;
      }
    }
    
    console.log(`[Notification] Cleaned up ${deleted} old notifications`);
    
    return deleted;
  } catch (error) {
    console.error('[Notification Service] Error cleaning up notifications:', error);
    return 0;
  }
}

// ============================================================================
// NOTIFICATION TEMPLATES
// ============================================================================

/**
 * Notify user that their account was approved
 */
export async function notifyUserApproved(userId: string, approvedBy: string): Promise<void> {
  await createNotification({
    userId,
    type: 'user_approved',
    title: 'Account Approved! 🎉',
    message: 'Your account has been approved. You can now access the Rouge Dashboard.',
    relatedUserId: approvedBy,
    actionUrl: '/home',
    actionLabel: 'Go to Dashboard',
    priority: 'high',
  });
}

/**
 * Notify user that their account was rejected
 */
export async function notifyUserRejected(userId: string, reason: string): Promise<void> {
  await createNotification({
    userId,
    type: 'user_rejected',
    title: 'Account Application Update',
    message: `Your account application was not approved. Reason: ${reason}`,
    actionUrl: '/contact',
    actionLabel: 'Contact Support',
    priority: 'high',
  });
}

/**
 * Notify user that their role was changed
 */
export async function notifyRoleChanged(
  userId: string,
  oldRole: string,
  newRole: string,
  changedBy: string
): Promise<void> {
  await createNotification({
    userId,
    type: 'role_changed',
    title: 'Role Updated',
    message: `Your role has been changed from ${oldRole} to ${newRole}.`,
    relatedUserId: changedBy,
    actionUrl: '/home',
    actionLabel: 'View Dashboard',
    priority: 'normal',
  });
}

/**
 * Notify user that tool access was granted
 */
export async function notifyToolAccessGranted(
  userId: string,
  toolName: string,
  toolPath: string
): Promise<void> {
  await createNotification({
    userId,
    type: 'tool_access_granted',
    title: 'Tool Access Granted ✅',
    message: `You now have access to ${toolName}.`,
    actionUrl: toolPath,
    actionLabel: 'Open Tool',
    priority: 'normal',
  });
}

/**
 * Notify user that tool access was denied
 */
export async function notifyToolAccessDenied(
  userId: string,
  toolName: string,
  reason: string
): Promise<void> {
  await createNotification({
    userId,
    type: 'tool_access_denied',
    title: 'Tool Access Request Denied',
    message: `Your request for ${toolName} was denied. Reason: ${reason}`,
    actionUrl: '/contact',
    actionLabel: 'Contact Admin',
    priority: 'normal',
  });
}

/**
 * Notify admins of new user signup
 */
export async function notifyNewSignup(
  newUserId: string,
  userEmail: string,
  requestedRole: string
): Promise<void> {
  await notifyAdmins({
    type: 'new_signup',
    title: 'New User Signup',
    message: `${userEmail} has signed up and is requesting ${requestedRole} role.`,
    relatedUserId: newUserId,
    actionUrl: '/admin/approvals',
    actionLabel: 'Review Signup',
    priority: 'high',
  });
}

/**
 * Notify admins of new tool access request
 */
export async function notifyNewToolRequest(
  userId: string,
  userEmail: string,
  toolName: string,
  requestId: string
): Promise<void> {
  await notifyAdmins({
    type: 'new_tool_request',
    title: 'New Tool Access Request',
    message: `${userEmail} has requested access to ${toolName}.`,
    relatedUserId: userId,
    relatedResourceType: 'tool_request',
    relatedResourceId: requestId,
    actionUrl: '/admin/tool-requests',
    actionLabel: 'Review Request',
    priority: 'normal',
  });
}

/**
 * Notify admins of security alert
 */
export async function notifySecurityAlert(
  title: string,
  message: string,
  metadata?: Record<string, any>
): Promise<void> {
  await notifyAdmins({
    type: 'security_alert',
    title,
    message,
    priority: 'urgent',
    metadata,
  });
}

/**
 * Notify user of password reset
 */
export async function notifyPasswordReset(userId: string): Promise<void> {
  await createNotification({
    userId,
    type: 'password_reset',
    title: 'Password Reset Successful',
    message: 'Your password has been reset successfully. If you did not request this, please contact support immediately.',
    actionUrl: '/contact',
    actionLabel: 'Contact Support',
    priority: 'high',
  });
}

/**
 * Notify user of account locked
 */
export async function notifyAccountLocked(userId: string, reason: string): Promise<void> {
  await createNotification({
    userId,
    type: 'account_locked',
    title: 'Account Locked',
    message: `Your account has been locked. Reason: ${reason}. Please contact support.`,
    actionUrl: '/contact',
    actionLabel: 'Contact Support',
    priority: 'urgent',
  });
}
