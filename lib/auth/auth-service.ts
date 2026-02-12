/**
 * Authentication Service
 * Enterprise-grade user authentication and management
 */

import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { getDb } from '@/utils/dbConfig';
import { Users, Sessions, AuditLogs, PasswordResetTokens, EmailVerificationTokens } from '@/utils/auth-schema';
import { eq, and, gt, desc } from 'drizzle-orm';
import type { User, NewUser, NewSession, NewAuditLog, RolePermission } from '@/utils/auth-schema';
import { cleanupExpiredSessions } from '@/lib/security/session-manager';

// ============================================================================
// EMAIL VALIDATION
// ============================================================================

/**
 * Check if email is allowed to register/login
 * Rouge emails (.rouge@gmail.com) and @rougevc.com are allowed
 */
export function isRougeEmail(email: string): boolean {
  const normalizedEmail = email.toLowerCase().trim();
  return (
    normalizedEmail.endsWith('.rouge@gmail.com') ||
    normalizedEmail.endsWith('.acp@gmail.com') ||
    normalizedEmail.endsWith('@rougevc.com')
  );
}

/**
 * Get rejection reason for non-Rouge emails
 */
export function getEmailRejectionReason(email: string): string {
  if (!email || !email.includes('@')) {
    return 'Invalid email format';
  }

  if (!isRougeEmail(email)) {
    return 'Access restricted to Rouge team members only. Please use your authorized email address (ending with .rouge@gmail.com, .acp@gmail.com, or @rougevc.com)';
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
  avatar?: string;
  requestedUnit?: string;
  requestedRole?: string;
  signupJustification?: string;
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

  // Determine if this is OAuth signup (auto-approve) or manual signup (requires approval)
  const isOAuthSignup = data.oauthProvider === 'google';
  const isApproved = isOAuthSignup; // Auto-approve OAuth signups for now
  const status = isApproved ? 'active' : 'pending';
  const role = isApproved ? 'member' : 'member'; // Default role

  // Create user
  const result = await db.insert(Users).values({
    email: data.email.toLowerCase(),
    passwordHash,
    firstName: data.firstName,
    lastName: data.lastName,
    displayName: `${data.firstName} ${data.lastName}`,
    avatar: data.avatar || null,
    oauthProvider: data.oauthProvider || 'credentials',
    googleId: data.googleId,
    role: role,
    status: status,
    isActive: true,
    isApproved: isApproved,
    requestedUnit: data.requestedUnit,
    requestedRole: data.requestedRole || 'member',
    signupJustification: data.signupJustification,
    unit: isApproved ? (data.requestedUnit || null) : null, // Set unit only if approved
    emailVerified: isOAuthSignup, // Auto-verify Google OAuth
  }).returning();

  const user = result[0];

  // Log signup
  await logAuditEvent({
    userId: user.id,
    eventType: 'signup',
    eventCategory: 'auth',
    eventStatus: 'success',
    email: user.email,
    message: `User signed up with ${data.oauthProvider || 'credentials'}. Status: ${status}`,
    metadata: {
      requestedUnit: data.requestedUnit,
      requestedRole: data.requestedRole,
      isApproved: isApproved,
    },
  });

  // Notify admins of new signup (only if not auto-approved)
  if (!isApproved) {
    try {
      const { notifyNewSignup } = await import('@/lib/notifications/notification-service');
      await notifyNewSignup(user.id, user.email, data.requestedRole || 'member');
    } catch (error) {
      console.error('[Auth Service] Failed to notify admins of new signup:', error);
    }
  }

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

// ============================================================================
// USER APPROVAL QUEUE
// ============================================================================

import { UserApprovalQueue, AdminActivityLogs, RolePermissions, ToolAccessRequests } from '@/utils/auth-schema';

/**
 * Create approval queue entry for new user
 */
export async function createApprovalQueueEntry(data: {
  userId: string;
  requestedRole: string;
  requestedUnit: string;
  justification: string;
}): Promise<void> {
  const db = getDb();

  await db.insert(UserApprovalQueue).values({
    userId: data.userId,
    requestedRole: data.requestedRole,
    requestedUnit: data.requestedUnit,
    justification: data.justification,
    status: 'pending',
  });
}

/**
 * Get pending approval requests
 */
export async function getPendingApprovals(): Promise<any[]> {
  const db = getDb();

  const approvals = await db
    .select({
      approval: UserApprovalQueue,
      user: Users,
    })
    .from(UserApprovalQueue)
    .leftJoin(Users, eq(UserApprovalQueue.userId, Users.id))
    .where(eq(UserApprovalQueue.status, 'pending'))
    .orderBy(UserApprovalQueue.createdAt);

  return approvals;
}

/**
 * Approve user
 */
export async function approveUser(data: {
  userId: string;
  approvalId: string;
  adminId: string;
  assignedRole: string;
  assignedUnit: string;
  reviewNotes?: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<void> {
  const db = getDb();

  // Update user
  await db.update(Users)
    .set({
      isApproved: true,
      approvedBy: data.adminId,
      approvedAt: new Date(),
      role: data.assignedRole,
      unit: data.assignedUnit,
      roleAssignedBy: data.adminId,
      roleAssignedAt: new Date(),
      status: 'active',
      updatedAt: new Date(),
    })
    .where(eq(Users.id, data.userId));

  // Update approval queue
  await db.update(UserApprovalQueue)
    .set({
      status: 'approved',
      reviewedBy: data.adminId,
      reviewedAt: new Date(),
      reviewNotes: data.reviewNotes,
    })
    .where(eq(UserApprovalQueue.id, data.approvalId));

  // Log admin activity
  await logAdminActivity({
    adminId: data.adminId,
    action: 'approve_user',
    targetUserId: data.userId,
    targetResource: 'user_approval',
    oldValue: { isApproved: false, status: 'pending' },
    newValue: {
      isApproved: true,
      status: 'active',
      role: data.assignedRole,
      unit: data.assignedUnit
    },
    reason: data.reviewNotes,
    ipAddress: data.ipAddress,
    userAgent: data.userAgent,
  });

  // Log audit event
  await logAuditEvent({
    userId: data.userId,
    eventType: 'user_approved',
    eventCategory: 'admin',
    eventStatus: 'success',
    message: `User approved by admin and assigned role: ${data.assignedRole}, unit: ${data.assignedUnit}`,
    metadata: {
      adminId: data.adminId,
      assignedRole: data.assignedRole,
      assignedUnit: data.assignedUnit,
    },
  });

  // Send welcome notification
  try {
    const { notifyUserApproved } = await import('@/lib/notifications/notification-service');
    await notifyUserApproved(data.userId, data.adminId);
  } catch (error) {
    console.error('[Auth Service] Failed to send approval notification:', error);
  }
}

/**
 * Reject user
 */
export async function rejectUser(data: {
  userId: string;
  approvalId: string;
  adminId: string;
  reviewNotes: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<void> {
  const db = getDb();

  // Update user status
  await db.update(Users)
    .set({
      status: 'suspended',
      updatedAt: new Date(),
    })
    .where(eq(Users.id, data.userId));

  // Update approval queue
  await db.update(UserApprovalQueue)
    .set({
      status: 'rejected',
      reviewedBy: data.adminId,
      reviewedAt: new Date(),
      reviewNotes: data.reviewNotes,
    })
    .where(eq(UserApprovalQueue.id, data.approvalId));

  // Log admin activity
  await logAdminActivity({
    adminId: data.adminId,
    action: 'reject_user',
    targetUserId: data.userId,
    targetResource: 'user_approval',
    oldValue: { status: 'pending' },
    newValue: { status: 'suspended' },
    reason: data.reviewNotes,
    ipAddress: data.ipAddress,
    userAgent: data.userAgent,
  });

  // Log audit event
  await logAuditEvent({
    userId: data.userId,
    eventType: 'user_rejected',
    eventCategory: 'admin',
    eventStatus: 'success',
    message: 'User registration rejected by admin',
    metadata: {
      adminId: data.adminId,
      reason: data.reviewNotes,
    },
  });

  // Send rejection notification
  try {
    const { notifyUserRejected } = await import('@/lib/notifications/notification-service');
    await notifyUserRejected(data.userId, data.reviewNotes);
  } catch (error) {
    console.error('[Auth Service] Failed to send rejection notification:', error);
  }
}

// ============================================================================
// ADMIN ACTIVITY LOGGING
// ============================================================================

/**
 * Log admin activity
 */
export async function logAdminActivity(data: {
  adminId: string;
  action: string;
  targetUserId?: string;
  targetResource?: string;
  oldValue?: any;
  newValue?: any;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<void> {
  const db = getDb();

  try {
    await db.insert(AdminActivityLogs).values({
      adminId: data.adminId,
      action: data.action,
      targetUserId: data.targetUserId,
      targetResource: data.targetResource,
      oldValue: data.oldValue,
      newValue: data.newValue,
      reason: data.reason,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    });
  } catch (error) {
    console.error('[Auth Service] Failed to log admin activity:', error);
    // Don't throw - logging should not break the main flow
  }
}

/**
 * Get admin activity logs
 */
export async function getAdminActivityLogs(filters?: {
  adminId?: string;
  action?: string;
  targetUserId?: string;
  limit?: number;
  offset?: number;
}): Promise<any[]> {
  const db = getDb();

  let query = db
    .select({
      log: AdminActivityLogs,
      admin: Users,
    })
    .from(AdminActivityLogs)
    .leftJoin(Users, eq(AdminActivityLogs.adminId, Users.id))
    .orderBy(AdminActivityLogs.createdAt);

  // Apply filters if provided
  // Note: This is a simplified version. In production, you'd want to use proper query building

  const logs = await query.limit(filters?.limit || 100);

  return logs;
}

// ============================================================================
// ROLE PERMISSIONS
// ============================================================================

/**
 * Check if user has permission
 */
export async function hasPermission(
  userId: string,
  resource: string,
  action: string
): Promise<boolean> {
  const db = getDb();

  // Get user
  const user = await findUserById(userId);
  if (!user) return false;

  // Admins have all permissions
  if (user.role === 'admin') return true;

  // Check role permissions
  if (!user.role) return false;

  const [permission] = await db
    .select()
    .from(RolePermissions)
    .where(
      and(
        eq(RolePermissions.role, user.role),
        eq(RolePermissions.resource, resource),
        eq(RolePermissions.action, action)
      )
    )
    .limit(1);

  return permission?.allowed || false;
}

/**
 * Check if user can access tool
 */
export async function canAccessTool(userId: string, toolName: string): Promise<boolean> {
  return hasPermission(userId, toolName, 'execute');
}

/**
 * Get user's accessible tools
 */
export async function getAccessibleTools(userId: string): Promise<string[]> {
  const db = getDb();

  const user = await findUserById(userId);
  if (!user) return [];

  // Admins can access all tools
  if (user.role === 'admin') {
    return ['*']; // Special marker for all tools
  }

  // Check if user has a role
  if (!user.role) return [];

  // Get tools user can execute
  const permissions = await db
    .select()
    .from(RolePermissions)
    .where(
      and(
        eq(RolePermissions.role, user.role),
        eq(RolePermissions.action, 'execute'),
        eq(RolePermissions.allowed, true)
      )
    );

  return permissions.map((p: RolePermission) => p.resource);
}

// ============================================================================
// TOOL ACCESS REQUESTS
// ============================================================================

/**
 * Create tool access request
 */
export async function createToolAccessRequest(data: {
  userId: string;
  toolName: string;
  toolPath: string;
  justification: string;
}): Promise<string> {
  const db = getDb();

  const [request] = await db.insert(ToolAccessRequests).values({
    userId: data.userId,
    toolName: data.toolName,
    toolPath: data.toolPath,
    justification: data.justification,
    status: 'pending',
  }).returning({ id: ToolAccessRequests.id });

  // Log audit event
  await logAuditEvent({
    userId: data.userId,
    eventType: 'tool_access_requested',
    eventCategory: 'access',
    eventStatus: 'success',
    message: `User requested access to tool: ${data.toolName}`,
    metadata: {
      toolName: data.toolName,
      toolPath: data.toolPath,
    },
  });

  // Notify admins of new tool request
  try {
    const user = await findUserById(data.userId);
    if (user) {
      const { notifyNewToolRequest } = await import('@/lib/notifications/notification-service');
      await notifyNewToolRequest(data.userId, user.email, data.toolName, request.id);
    }
  } catch (error) {
    console.error('[Auth Service] Failed to notify admins of tool request:', error);
  }

  return request.id;
}

/**
 * Get pending tool access requests
 */
export async function getPendingToolAccessRequests(): Promise<any[]> {
  const db = getDb();

  const requests = await db
    .select({
      request: ToolAccessRequests,
      user: Users,
    })
    .from(ToolAccessRequests)
    .leftJoin(Users, eq(ToolAccessRequests.userId, Users.id))
    .where(eq(ToolAccessRequests.status, 'pending'))
    .orderBy(ToolAccessRequests.createdAt);

  return requests;
}

/**
 * Approve tool access request
 */
export async function approveToolAccessRequest(data: {
  requestId: string;
  adminId: string;
  reviewNotes?: string;
}): Promise<void> {
  const db = getDb();

  // Update request
  await db.update(ToolAccessRequests)
    .set({
      status: 'approved',
      reviewedBy: data.adminId,
      reviewedAt: new Date(),
      reviewNotes: data.reviewNotes,
      updatedAt: new Date(),
    })
    .where(eq(ToolAccessRequests.id, data.requestId));

  // Get request details for logging
  const [request] = await db
    .select()
    .from(ToolAccessRequests)
    .where(eq(ToolAccessRequests.id, data.requestId))
    .limit(1);

  if (request) {
    // Log admin activity
    await logAdminActivity({
      adminId: data.adminId,
      action: 'approve_tool_access',
      targetUserId: request.userId,
      targetResource: request.toolName,
      oldValue: { status: 'pending' },
      newValue: { status: 'approved' },
      reason: data.reviewNotes,
    });

    // Send tool access granted notification
    try {
      const { notifyToolAccessGranted } = await import('@/lib/notifications/notification-service');
      await notifyToolAccessGranted(request.userId, request.toolName, request.toolPath || '/home');
    } catch (error) {
      console.error('[Auth Service] Failed to send tool access notification:', error);
    }
  }
}

/**
 * Change user role
 */
export async function changeUserRole(data: {
  userId: string;
  adminId: string;
  newRole: string;
  newUnit?: string;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<void> {
  const db = getDb();

  // Get current user data
  const user = await findUserById(data.userId);
  if (!user) throw new Error('User not found');

  const oldRole = user.role;
  const oldUnit = user.unit;

  // Update user
  await db.update(Users)
    .set({
      role: data.newRole,
      unit: data.newUnit || user.unit,
      roleAssignedBy: data.adminId,
      roleAssignedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(Users.id, data.userId));

  // Log admin activity
  await logAdminActivity({
    adminId: data.adminId,
    action: 'change_user_role',
    targetUserId: data.userId,
    targetResource: 'user_role',
    oldValue: { role: oldRole, unit: oldUnit },
    newValue: { role: data.newRole, unit: data.newUnit || oldUnit },
    reason: data.reason,
    ipAddress: data.ipAddress,
    userAgent: data.userAgent,
  });

  // Log audit event
  await logAuditEvent({
    userId: data.userId,
    eventType: 'role_changed',
    eventCategory: 'admin',
    eventStatus: 'success',
    message: `User role changed from ${oldRole} to ${data.newRole}`,
    metadata: {
      adminId: data.adminId,
      oldRole,
      newRole: data.newRole,
      oldUnit,
      newUnit: data.newUnit,
    },
  });

  // Send role change notification
  try {
    const { notifyRoleChanged } = await import('@/lib/notifications/notification-service');
    await notifyRoleChanged(data.userId, oldRole || 'none', data.newRole, data.adminId);
  } catch (error) {
    console.error('[Auth Service] Failed to send role change notification:', error);
  }
}


// ============================================================================
// PERMISSION AUDIT TRAIL
// ============================================================================

/**
 * Log permission change to audit trail
 */
export async function logPermissionChange(data: {
  adminId: string;
  role: string;
  resource: string;
  action: string;
  changeType: 'created' | 'updated' | 'deleted';
  oldValue?: { allowed: boolean; conditions?: any };
  newValue?: { allowed: boolean; conditions?: any };
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<void> {
  try {
    const db = getDb();
    const { PermissionAuditTrail } = await import('@/utils/auth-schema');

    await db.insert(PermissionAuditTrail).values({
      adminId: data.adminId,
      role: data.role,
      resource: data.resource,
      action: data.action,
      changeType: data.changeType,
      oldValue: data.oldValue,
      newValue: data.newValue,
      reason: data.reason,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    });

    console.log(`[Permission Audit] Logged ${data.changeType} for ${data.role}:${data.resource}:${data.action}`);
  } catch (error) {
    console.error('[Permission Audit] Error logging permission change:', error);
  }
}

/**
 * Get permission audit trail
 */
export async function getPermissionAuditTrail(filters?: {
  adminId?: string;
  role?: string;
  resource?: string;
  changeType?: string;
  limit?: number;
}): Promise<any[]> {
  try {
    const db = getDb();
    const { PermissionAuditTrail, Users } = await import('@/utils/auth-schema');

    let query = db
      .select({
        id: PermissionAuditTrail.id,
        adminId: PermissionAuditTrail.adminId,
        adminEmail: Users.email,
        adminName: Users.displayName,
        role: PermissionAuditTrail.role,
        resource: PermissionAuditTrail.resource,
        action: PermissionAuditTrail.action,
        changeType: PermissionAuditTrail.changeType,
        oldValue: PermissionAuditTrail.oldValue,
        newValue: PermissionAuditTrail.newValue,
        reason: PermissionAuditTrail.reason,
        ipAddress: PermissionAuditTrail.ipAddress,
        userAgent: PermissionAuditTrail.userAgent,
        createdAt: PermissionAuditTrail.createdAt,
      })
      .from(PermissionAuditTrail)
      .leftJoin(Users, eq(PermissionAuditTrail.adminId, Users.id))
      .orderBy(desc(PermissionAuditTrail.createdAt));

    if (filters?.limit) {
      query = query.limit(filters.limit) as any;
    }

    const results = await query;

    return results;
  } catch (error) {
    console.error('[Permission Audit] Error getting audit trail:', error);
    return [];
  }
}

// ============================================================================
// SESSION CLEANUP
// ============================================================================

/**
 * Clean up expired sessions (should be called periodically)
 */
export async function performSessionCleanup(): Promise<void> {
  try {
    await cleanupExpiredSessions();
    console.log('[Session Cleanup] Expired sessions cleaned up successfully');
  } catch (error) {
    console.error('[Session Cleanup] Failed to clean up expired sessions:', error);
  }
}
