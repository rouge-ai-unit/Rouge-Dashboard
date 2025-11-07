/**
 * Approval Expiry Management
 * Handles re-approval requirements after inactivity
 */

import { getDb } from '@/utils/dbConfig';
import { Users } from '@/utils/auth-schema';
import { eq, and, lt } from 'drizzle-orm';
import { notifyAdmins } from '@/lib/notifications/notification-service';

const INACTIVITY_THRESHOLD_DAYS = 90; // 90 days of inactivity

/**
 * Update user's last active timestamp
 */
export async function updateLastActive(userId: string): Promise<void> {
  try {
    const db = getDb();
    
    await db
      .update(Users)
      .set({
        lastActiveAt: new Date(),
      })
      .where(eq(Users.id, userId));
  } catch (error) {
    console.error('[Approval Expiry] Error updating last active:', error);
  }
}

/**
 * Check if user needs re-approval due to inactivity
 */
export async function checkApprovalExpiry(userId: string): Promise<{
  needsReapproval: boolean;
  daysSinceActive?: number;
  lastActiveAt?: Date;
}> {
  try {
    const db = getDb();
    
    const [user] = await db
      .select()
      .from(Users)
      .where(eq(Users.id, userId))
      .limit(1);
    
    if (!user) {
      return { needsReapproval: false };
    }
    
    // If user was never active or lastActiveAt is null, use approvedAt
    const lastActive = user.lastActiveAt || user.approvedAt || user.createdAt;
    
    if (!lastActive) {
      return { needsReapproval: false };
    }
    
    const now = new Date();
    const daysSinceActive = Math.floor(
      (now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    const needsReapproval = daysSinceActive > INACTIVITY_THRESHOLD_DAYS;
    
    return {
      needsReapproval,
      daysSinceActive,
      lastActiveAt: lastActive,
    };
  } catch (error) {
    console.error('[Approval Expiry] Error checking approval expiry:', error);
    return { needsReapproval: false };
  }
}

/**
 * Mark user as needing re-approval
 */
export async function requireReapproval(
  userId: string,
  reason: string
): Promise<boolean> {
  try {
    const db = getDb();
    
    // Get user details
    const [user] = await db
      .select()
      .from(Users)
      .where(eq(Users.id, userId))
      .limit(1);
    
    if (!user) {
      return false;
    }
    
    // Set user to pending status (maintain access during review)
    await db
      .update(Users)
      .set({
        status: 'pending',
        // Note: We don't set isApproved to false to maintain access during review
      })
      .where(eq(Users.id, userId));
    
    // Notify admins
    await notifyAdmins({
      type: 'security_alert',
      title: 'User Requires Re-approval',
      message: `${user.displayName || user.email} requires re-approval due to ${reason}`,
      relatedUserId: userId,
      actionUrl: '/admin/users',
      actionLabel: 'Review User',
      priority: 'normal',
    });
    
    console.log(`[Approval Expiry] User ${userId} marked for re-approval: ${reason}`);
    
    return true;
  } catch (error) {
    console.error('[Approval Expiry] Error requiring re-approval:', error);
    return false;
  }
}

/**
 * Find all users who need re-approval due to inactivity
 */
export async function findUsersNeedingReapproval(): Promise<any[]> {
  try {
    const db = getDb();
    
    // Calculate threshold date
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - INACTIVITY_THRESHOLD_DAYS);
    
    // Find users who are approved but haven't been active
    const users = await db
      .select()
      .from(Users)
      .where(
        and(
          eq(Users.isApproved, true),
          eq(Users.isActive, true),
          lt(Users.lastActiveAt, thresholdDate)
        )
      );
    
    return users;
  } catch (error) {
    console.error('[Approval Expiry] Error finding users needing re-approval:', error);
    return [];
  }
}

/**
 * Process approval expiry for all inactive users
 * This should be run as a scheduled job (e.g., daily cron)
 */
export async function processApprovalExpiry(): Promise<{
  processed: number;
  errors: number;
}> {
  try {
    const users = await findUsersNeedingReapproval();
    
    let processed = 0;
    let errors = 0;
    
    for (const user of users) {
      const result = await requireReapproval(
        user.id,
        `inactivity for ${INACTIVITY_THRESHOLD_DAYS} days`
      );
      
      if (result) {
        processed++;
      } else {
        errors++;
      }
    }
    
    console.log(`[Approval Expiry] Processed ${processed} users, ${errors} errors`);
    
    return { processed, errors };
  } catch (error) {
    console.error('[Approval Expiry] Error processing approval expiry:', error);
    return { processed: 0, errors: 0 };
  }
}

/**
 * Restore user approval after re-approval
 */
export async function restoreApproval(
  userId: string,
  adminId: string
): Promise<boolean> {
  try {
    const db = getDb();
    
    await db
      .update(Users)
      .set({
        status: 'active',
        isApproved: true,
        approvedBy: adminId,
        approvedAt: new Date(),
        lastActiveAt: new Date(),
      })
      .where(eq(Users.id, userId));
    
    console.log(`[Approval Expiry] User ${userId} approval restored by admin ${adminId}`);
    
    return true;
  } catch (error) {
    console.error('[Approval Expiry] Error restoring approval:', error);
    return false;
  }
}
