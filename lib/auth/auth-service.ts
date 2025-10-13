/**
 * Authentication Service
 * Enterprise-grade user authentication and management
 */

import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { getDb } from '@/utils/dbConfig';
import { Users, Sessions, AuditLogs, PasswordResetTokens, EmailVerificationTokens } from '@/utils/auth-schema';
import { eq, and, gt } from 'drizzle-orm';
import type { User, NewUser, NewSession, NewAuditLog } from '@/utils/auth-schema';

// ============================================================================
// EMAIL VALIDATION
// ============================================================================

/**
 * Check if email is allowed to register/login
 * Rouge emails (.rouge@gmail.com) and @rougevc.com are allowed
 */
export function isRougeEmail(email: string): boolean {
  const normalizedEmail = email.toLowerCase().trim();
  return normalizedEmail.endsWith('.rouge@gmail.com') || normalizedEmail.endsWith('@rougevc.com');
}

/**
 * Get rejection reason for non-Rouge emails
 */
export function getEmailRejectionReason(email: string): string {
  if (!email || !email.includes('@')) {
    return 'Invalid email format';
  }
  
  if (!isRougeEmail(email)) {
    return 'Access restricted to Rouge team members only. Please use your Rouge email address (ending with .rouge@gmail.com or @rougevc.com)';
  }
  
  return '';
}

// ============================================================================
// PASSWORD UTILITIES
// ============================================================================

const SALT_ROUNDS = 12;

/**
 * Hash password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify password against hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate secure random token
 */
export function generateToken(length: number = 32): string {
  return randomBytes(length).toString('hex');
}

// ============================================================================
// USER MANAGEMENT
// ============================================================================

/**
 * Create new user
 */
export async function createUser(data: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  oauthProvider?: string;
  googleId?: string;
}): Promise<User> {
  const db = getDb();
  
  // Validate Rouge email
  if (!isRougeEmail(data.email)) {
    throw new Error(getEmailRejectionReason(data.email));
  }
  
  // Check if user already exists
  const [existingUser] = await db.select().from(Users).where(eq(Users.email, data.email.toLowerCase())).limit(1);
  
  if (existingUser) {
    throw new Error('User with this email already exists');
  }
  
  // Hash password
  const passwordHash = await hashPassword(data.password);
  
  // Create user
  const [user] = await db.insert(Users).values({
    email: data.email.toLowerCase(),
    passwordHash,
    firstName: data.firstName,
    lastName: data.lastName,
    displayName: `${data.firstName} ${data.lastName}`,
    oauthProvider: data.oauthProvider || 'credentials',
    googleId: data.googleId,
    role: 'user',
    status: 'active',
    isActive: true,
    emailVerified: data.oauthProvider === 'google', // Auto-verify Google OAuth
  }).returning();
  
  // Log signup
  await logAuditEvent({
    userId: user.id,
    eventType: 'signup',
    eventCategory: 'auth',
    eventStatus: 'success',
    email: user.email,
    message: `User signed up with ${data.oauthProvider || 'credentials'}`,
  });
  
  return user;
}

/**
 * Find user by email
 */
export async function findUserByEmail(email: string): Promise<User | undefined> {
  const db = getDb();
  const [user] = await db.select().from(Users).where(eq(Users.email, email.toLowerCase())).limit(1);
  return user;
}

/**
 * Find user by ID
 */
export async function findUserById(id: string): Promise<User | undefined> {
  const db = getDb();
  const [user] = await db.select().from(Users).where(eq(Users.id, id)).limit(1);
  return user;
}

/**
 * Find user by Google ID
 */
export async function findUserByGoogleId(googleId: string): Promise<User | undefined> {
  const db = getDb();
  const [user] = await db.select().from(Users).where(eq(Users.googleId, googleId)).limit(1);
  return user;
}

/**
 * Update user
 */
export async function updateUser(userId: string, data: Partial<User>): Promise<User> {
  const db = getDb();
  
  const [user] = await db.update(Users)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(Users.id, userId))
    .returning();
  
  return user;
}

/**
 * Update last login
 */
export async function updateLastLogin(userId: string, ipAddress?: string, device?: string): Promise<void> {
  const db = getDb();
  
  await db.update(Users)
    .set({
      lastLoginAt: new Date(),
      lastLoginIp: ipAddress,
      lastLoginDevice: device,
      failedLoginAttempts: 0, // Reset failed attempts on successful login
      updatedAt: new Date(),
    })
    .where(eq(Users.id, userId));
}

/**
 * Increment failed login attempts
 */
export async function incrementFailedLoginAttempts(email: string): Promise<number> {
  const db = getDb();
  
  const user = await findUserByEmail(email);
  if (!user) return 0;
  
  const newAttempts = (user.failedLoginAttempts || 0) + 1;
  
  // Lock account after 5 failed attempts for 15 minutes
  const shouldLock = newAttempts >= 5;
  const lockedUntil = shouldLock ? new Date(Date.now() + 15 * 60 * 1000) : null;
  
  await db.update(Users)
    .set({
      failedLoginAttempts: newAttempts,
      lockedUntil: lockedUntil,
      status: shouldLock ? 'locked' : user.status,
      updatedAt: new Date(),
    })
    .where(eq(Users.id, user.id));
  
  return newAttempts;
}

/**
 * Check if user is locked
 */
export async function isUserLocked(email: string): Promise<boolean> {
  const user = await findUserByEmail(email);
  if (!user) return false;
  
  if (user.status === 'locked' && user.lockedUntil) {
    // Check if lock has expired
    if (new Date() > user.lockedUntil) {
      // Unlock user
      const db = getDb();
      await db.update(Users)
        .set({
          status: 'active',
          lockedUntil: null,
          failedLoginAttempts: 0,
          updatedAt: new Date(),
        })
        .where(eq(Users.id, user.id));
      return false;
    }
    return true;
  }
  
  return false;
}

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================

/**
 * Create session
 */
export async function createSession(data: {
  userId: string;
  ipAddress?: string;
  userAgent?: string;
  device?: string;
  browser?: string;
  os?: string;
  expiresInDays?: number;
}): Promise<{ session: any; sessionToken: string }> {
  const db = getDb();
  
  const sessionToken = generateToken(64);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + (data.expiresInDays || 30));
  
  const [session] = await db.insert(Sessions).values({
    userId: data.userId,
    sessionToken,
    ipAddress: data.ipAddress,
    userAgent: data.userAgent,
    device: data.device,
    browser: data.browser,
    os: data.os,
    expiresAt,
    isActive: true,
  }).returning();
  
  return { session, sessionToken };
}

/**
 * Find session by token
 */
export async function findSessionByToken(token: string): Promise<any | undefined> {
  const db = getDb();
  const [session] = await db.select().from(Sessions).where(
    and(
      eq(Sessions.sessionToken, token),
      eq(Sessions.isActive, true),
      gt(Sessions.expiresAt, new Date())
    )
  ).limit(1);
  return session;
}

/**
 * Revoke session
 */
export async function revokeSession(sessionToken: string, reason?: string): Promise<void> {
  const db = getDb();
  
  await db.update(Sessions)
    .set({
      isActive: false,
      revokedAt: new Date(),
      revokedReason: reason,
    })
    .where(eq(Sessions.sessionToken, sessionToken));
}

/**
 * Revoke all user sessions
 */
export async function revokeAllUserSessions(userId: string, reason?: string): Promise<void> {
  const db = getDb();
  
  await db.update(Sessions)
    .set({
      isActive: false,
      revokedAt: new Date(),
      revokedReason: reason,
    })
    .where(eq(Sessions.userId, userId));
}

// ============================================================================
// PASSWORD RESET
// ============================================================================

/**
 * Create password reset token
 */
export async function createPasswordResetToken(email: string): Promise<string> {
  const db = getDb();
  
  const user = await findUserByEmail(email);
  if (!user) {
    throw new Error('User not found');
  }
  
  // Invalidate any existing tokens
  await db.update(PasswordResetTokens)
    .set({ isUsed: true })
    .where(eq(PasswordResetTokens.userId, user.id));
  
  // Create new token
  const token = generateToken(32);
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiry
  
  await db.insert(PasswordResetTokens).values({
    userId: user.id,
    token,
    expiresAt,
    isUsed: false,
  });
  
  // Log event
  await logAuditEvent({
    userId: user.id,
    eventType: 'password_reset_requested',
    eventCategory: 'security',
    eventStatus: 'success',
    email: user.email,
    message: 'Password reset token created',
  });
  
  return token;
}

/**
 * Verify password reset token
 */
export async function verifyPasswordResetToken(token: string): Promise<User | null> {
  const db = getDb();
  
  const [resetToken] = await db.select().from(PasswordResetTokens).where(
    and(
      eq(PasswordResetTokens.token, token),
      eq(PasswordResetTokens.isUsed, false),
      gt(PasswordResetTokens.expiresAt, new Date())
    )
  ).limit(1);
  
  if (!resetToken) {
    return null;
  }
  
  const user = await findUserById(resetToken.userId);
  return user || null;
}

/**
 * Reset password with token
 */
export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const db = getDb();
  
  const user = await verifyPasswordResetToken(token);
  if (!user) {
    throw new Error('Invalid or expired reset token');
  }
  
  // Hash new password
  const passwordHash = await hashPassword(newPassword);
  
  // Update user password
  await db.update(Users)
    .set({
      passwordHash,
      passwordChangedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(Users.id, user.id));
  
  // Mark token as used
  await db.update(PasswordResetTokens)
    .set({
      isUsed: true,
      usedAt: new Date(),
    })
    .where(eq(PasswordResetTokens.token, token));
  
  // Revoke all sessions for security
  await revokeAllUserSessions(user.id, 'Password reset');
  
  // Log event
  await logAuditEvent({
    userId: user.id,
    eventType: 'password_reset_completed',
    eventCategory: 'security',
    eventStatus: 'success',
    email: user.email,
    message: 'Password reset successfully',
  });
}

// ============================================================================
// AUDIT LOGGING
// ============================================================================

/**
 * Log audit event
 */
export async function logAuditEvent(data: NewAuditLog): Promise<void> {
  const db = getDb();
  
  try {
    await db.insert(AuditLogs).values({
      ...data,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error('[Auth Service] Failed to log audit event:', error);
    // Don't throw - logging should not break the main flow
  }
}

/**
 * Log login attempt
 */
export async function logLoginAttempt(data: {
  email: string;
  success: boolean;
  ipAddress?: string;
  userAgent?: string;
  errorMessage?: string;
  userId?: string;
}): Promise<void> {
  await logAuditEvent({
    userId: data.userId,
    eventType: 'login_attempt',
    eventCategory: 'auth',
    eventStatus: data.success ? 'success' : 'failure',
    email: data.email,
    ipAddress: data.ipAddress,
    userAgent: data.userAgent,
    message: data.success ? 'Login successful' : 'Login failed',
    errorMessage: data.errorMessage,
  });
}
