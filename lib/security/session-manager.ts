/**
 * Role-Based Session Management
 * Handles different session durations for different roles
 */

import { getDb } from '@/utils/dbConfig';
import { Sessions, Users } from '@/utils/auth-schema';
import { eq, and } from 'drizzle-orm';

/**
 * Role-based session durations (in seconds)
 */
export const ROLE_SESSION_DURATIONS = {
  admin: 8 * 60 * 60, // 8 hours
  leader: 4 * 60 * 60, // 4 hours
  'co-leader': 4 * 60 * 60, // 4 hours
  member: 2 * 60 * 60, // 2 hours
} as const;

/**
 * Get session duration for a role
 */
export function getSessionDurationForRole(role: string): number {
  return ROLE_SESSION_DURATIONS[role as keyof typeof ROLE_SESSION_DURATIONS] || ROLE_SESSION_DURATIONS.member;
}

/**
 * Check if session is expired based on role
 */
export function isSessionExpired(
  sessionCreatedAt: Date,
  role: string
): boolean {
  const duration = getSessionDurationForRole(role);
  const expiryTime = new Date(sessionCreatedAt.getTime() + duration * 1000);
  
  return new Date() > expiryTime;
}

/**
 * Get session expiry time for a role
 */
export function getSessionExpiryTime(
  sessionCreatedAt: Date,
  role: string
): Date {
  const duration = getSessionDurationForRole(role);
  return new Date(sessionCreatedAt.getTime() + duration * 1000);
}

/**
 * Create or update user session
 */
export async function createUserSession(data: {
  userId: string;
  sessionToken: string;
  ipAddress: string;
  userAgent: string;
  deviceInfo?: string;
}): Promise<void> {
  try {
    const db = getDb();
    
    // Check if session already exists
    const [existingSession] = await db
      .select()
      .from(Sessions)
      .where(eq(Sessions.sessionToken, data.sessionToken))
      .limit(1);
    
    if (existingSession) {
      // Update existing session
      await db
        .update(Sessions)
        .set({
          expiresAt: getSessionExpiryTime(new Date(), 'member'), // Will be updated based on actual role
        })
        .where(eq(Sessions.sessionToken, data.sessionToken));
    } else {
      // Create new session
      await db.insert(Sessions).values({
        userId: data.userId,
        sessionToken: data.sessionToken,
        expiresAt: getSessionExpiryTime(new Date(), 'member'), // Will be updated based on actual role
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        device: data.deviceInfo,
      });
    }
  } catch (error) {
    console.error('[Session Manager] Error creating/updating session:', error);
  }
}

/**
 * Revoke all sessions for a user
 */
export async function revokeAllUserSessions(userId: string): Promise<number> {
  try {
    const db = getDb();
    
    // Get all sessions for user
    const sessions = await db
      .select()
      .from(Sessions)
      .where(eq(Sessions.userId, userId));
    
    // Delete each session
    for (const session of sessions) {
      await db
        .delete(Sessions)
        .where(eq(Sessions.sessionToken, session.sessionToken));
    }
    
    console.log(`[Session Manager] Revoked ${sessions.length} sessions for user ${userId}`);
    
    return sessions.length;
  } catch (error) {
    console.error('[Session Manager] Error revoking sessions:', error);
    return 0;
  }
}

/**
 * Revoke a specific session
 */
export async function revokeSession(sessionToken: string): Promise<boolean> {
  try {
    const db = getDb();
    
    await db
      .delete(Sessions)
      .where(eq(Sessions.sessionToken, sessionToken));
    
    return true;
  } catch (error) {
    console.error('[Session Manager] Error revoking session:', error);
    return false;
  }
}

/**
 * Get active sessions for a user
 */
export async function getUserActiveSessions(userId: string): Promise<any[]> {
  try {
    const db = getDb();
    
    const sessions = await db
      .select()
      .from(Sessions)
      .where(eq(Sessions.userId, userId));
    
    return sessions;
  } catch (error) {
    console.error('[Session Manager] Error getting user sessions:', error);
    return [];
  }
}

/**
 * Clean up expired sessions based on role
 */
export async function cleanupExpiredSessions(): Promise<number> {
  try {
    const db = getDb();
    
    // Get all sessions
    const sessions = await db
      .select()
      .from(Sessions);
    
    let cleaned = 0;
    const now = new Date();
    
    for (const session of sessions) {
      // Check if session is expired
      if (session.expiresAt && session.expiresAt < now) {
        await db
          .delete(Sessions)
          .where(eq(Sessions.sessionToken, session.sessionToken));
        
        cleaned++;
      }
    }
    
    console.log(`[Session Manager] Cleaned up ${cleaned} expired sessions`);
    
    return cleaned;
  } catch (error) {
    console.error('[Session Manager] Error cleaning up sessions:', error);
    return 0;
  }
}

/**
 * Force logout on role change
 */
export async function forceLogoutOnRoleChange(
  userId: string,
  oldRole: string,
  newRole: string
): Promise<void> {
  try {
    console.log(`[Session Manager] Role changed for user ${userId}: ${oldRole} → ${newRole}`);
    
    // Revoke all sessions to force re-login with new role
    await revokeAllUserSessions(userId);
    
    console.log(`[Session Manager] Forced logout for user ${userId} due to role change`);
  } catch (error) {
    console.error('[Session Manager] Error forcing logout on role change:', error);
  }
}

/**
 * Revoke all sessions on security event
 */
export async function revokeSessionsOnSecurityEvent(
  userId: string,
  reason: string
): Promise<void> {
  try {
    console.log(`[Session Manager] Security event for user ${userId}: ${reason}`);
    
    // Revoke all sessions
    await revokeAllUserSessions(userId);
    
    console.log(`[Session Manager] Revoked all sessions for user ${userId} due to security event`);
  } catch (error) {
    console.error('[Session Manager] Error revoking sessions on security event:', error);
  }
}

// Auto cleanup every hour
if (typeof window === 'undefined') {
  setInterval(cleanupExpiredSessions, 60 * 60 * 1000);
}
