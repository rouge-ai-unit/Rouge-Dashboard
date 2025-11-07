/**
 * Authentication Database Schema
 * Enterprise-grade user management, sessions, and security
 */

import { boolean, date, integer, jsonb, pgTable, text, uuid, varchar, timestamp, index } from "drizzle-orm/pg-core";
import { z } from "zod";

// ============================================================================
// USERS TABLE
// ============================================================================

export const Users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  emailVerified: boolean("email_verified").default(false),
  passwordHash: varchar("password_hash", { length: 255 }), // bcrypt hash
  
  // Profile
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  displayName: varchar("display_name", { length: 200 }),
  avatar: text("avatar"), // URL to avatar image
  
  // OAuth
  googleId: varchar("google_id", { length: 255 }),
  oauthProvider: varchar("oauth_provider", { length: 50 }), // 'google', 'credentials'
  
  // Role & Permissions (RBAC)
  role: varchar("role", { length: 50 }).default("member"), // 'admin', 'leader', 'co-leader', 'member'
  permissions: jsonb("permissions").$type<string[]>().default([]),
  unit: varchar("unit", { length: 100 }), // User's organizational unit (AI Unit, VC Management, Social Media, etc.)
  
  // Approval Workflow
  isApproved: boolean("is_approved").default(false), // Approval status
  approvedBy: uuid("approved_by"), // Admin who approved
  approvedAt: timestamp("approved_at"), // When approved
  roleAssignedBy: uuid("role_assigned_by"), // Who assigned the role
  roleAssignedAt: timestamp("role_assigned_at"), // When role was assigned
  requestedRole: varchar("requested_role", { length: 50 }), // Role requested during signup
  requestedUnit: varchar("requested_unit", { length: 100 }), // Unit requested during signup
  signupJustification: text("signup_justification"), // Why they need access
  
  // Activity Tracking
  lastActiveAt: timestamp("last_active_at"), // Last activity timestamp for approval expiry
  
  // Status
  status: varchar("status", { length: 50 }).default("pending"), // 'active', 'suspended', 'locked', 'pending'
  isActive: boolean("is_active").default(true),
  
  // Security
  failedLoginAttempts: integer("failed_login_attempts").default(0),
  lockedUntil: timestamp("locked_until"),
  lastLoginAt: timestamp("last_login_at"),
  lastLoginIp: varchar("last_login_ip", { length: 45 }),
  lastLoginDevice: text("last_login_device"),
  
  // Password Management
  passwordChangedAt: timestamp("password_changed_at"),
  passwordResetToken: varchar("password_reset_token", { length: 255 }),
  passwordResetExpires: timestamp("password_reset_expires"),
  
  // MFA
  mfaEnabled: boolean("mfa_enabled").default(false),
  mfaSecret: varchar("mfa_secret", { length: 255 }),
  mfaBackupCodes: jsonb("mfa_backup_codes").$type<string[]>(),
  
  // Metadata
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
}, (table) => ({
  emailIdx: index("users_email_idx").on(table.email),
  googleIdIdx: index("users_google_id_idx").on(table.googleId),
  statusIdx: index("users_status_idx").on(table.status),
  roleIdx: index("users_role_idx").on(table.role),
  unitIdx: index("users_unit_idx").on(table.unit),
  isApprovedIdx: index("users_is_approved_idx").on(table.isApproved),
}));

// ============================================================================
// SESSIONS TABLE
// ============================================================================

export const Sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => Users.id, { onDelete: "cascade" }),
  sessionToken: varchar("session_token", { length: 255 }).notNull().unique(),
  
  // Session Info
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  device: varchar("device", { length: 100 }),
  browser: varchar("browser", { length: 100 }),
  os: varchar("os", { length: 100 }),
  location: jsonb("location").$type<{
    country?: string;
    region?: string;
    city?: string;
  }>(),
  
  // Expiry
  expiresAt: timestamp("expires_at").notNull(),
  lastActivityAt: timestamp("last_activity_at").defaultNow(),
  
  // Status
  isActive: boolean("is_active").default(true),
  revokedAt: timestamp("revoked_at"),
  revokedReason: varchar("revoked_reason", { length: 255 }),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userIdIdx: index("sessions_user_id_idx").on(table.userId),
  sessionTokenIdx: index("sessions_token_idx").on(table.sessionToken),
  expiresAtIdx: index("sessions_expires_at_idx").on(table.expiresAt),
}));

// ============================================================================
// AUDIT LOGS TABLE
// ============================================================================

export const AuditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => Users.id, { onDelete: "set null" }),
  
  // Event Details
  eventType: varchar("event_type", { length: 100 }).notNull(), // 'login', 'logout', 'signup', 'password_reset', etc.
  eventCategory: varchar("event_category", { length: 50 }).notNull(), // 'auth', 'security', 'user', 'admin'
  eventStatus: varchar("event_status", { length: 50 }).notNull(), // 'success', 'failure', 'warning'
  
  // Context
  email: varchar("email", { length: 255 }),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  device: varchar("device", { length: 100 }),
  location: jsonb("location").$type<{
    country?: string;
    region?: string;
    city?: string;
  }>(),
  
  // Details
  message: text("message"),
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
  errorMessage: text("error_message"),
  
  // Timestamp
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userIdIdx: index("audit_logs_user_id_idx").on(table.userId),
  eventTypeIdx: index("audit_logs_event_type_idx").on(table.eventType),
  createdAtIdx: index("audit_logs_created_at_idx").on(table.createdAt),
}));

// ============================================================================
// PASSWORD RESET TOKENS TABLE
// ============================================================================

export const PasswordResetTokens = pgTable("password_reset_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => Users.id, { onDelete: "cascade" }),
  token: varchar("token", { length: 255 }).notNull().unique(),
  
  // Expiry
  expiresAt: timestamp("expires_at").notNull(),
  
  // Usage
  usedAt: timestamp("used_at"),
  isUsed: boolean("is_used").default(false),
  
  // Security
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  tokenIdx: index("password_reset_tokens_token_idx").on(table.token),
  userIdIdx: index("password_reset_tokens_user_id_idx").on(table.userId),
}));

// ============================================================================
// EMAIL VERIFICATION TOKENS TABLE
// ============================================================================

export const EmailVerificationTokens = pgTable("email_verification_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => Users.id, { onDelete: "cascade" }),
  email: varchar("email", { length: 255 }).notNull(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  
  // Expiry
  expiresAt: timestamp("expires_at").notNull(),
  
  // Usage
  verifiedAt: timestamp("verified_at"),
  isVerified: boolean("is_verified").default(false),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  tokenIdx: index("email_verification_tokens_token_idx").on(table.token),
  userIdIdx: index("email_verification_tokens_user_id_idx").on(table.userId),
}));

// ============================================================================
// ROLE PERMISSIONS TABLE
// ============================================================================

export const RolePermissions = pgTable("role_permissions", {
  id: uuid("id").defaultRandom().primaryKey(),
  
  // Role and Resource
  role: varchar("role", { length: 50 }).notNull(), // 'admin', 'leader', 'co-leader', 'member'
  resource: varchar("resource", { length: 100 }).notNull(), // Tool name, feature name, or resource identifier
  action: varchar("action", { length: 50 }).notNull(), // 'create', 'read', 'update', 'delete', 'execute'
  
  // Permission
  allowed: boolean("allowed").default(true).notNull(),
  
  // Conditions (for unit-specific or conditional permissions)
  conditions: jsonb("conditions").$type<{
    unit?: string;
    customRules?: Record<string, any>;
  }>().default({}),
  
  // Metadata
  description: text("description"),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  roleIdx: index("role_permissions_role_idx").on(table.role),
  resourceIdx: index("role_permissions_resource_idx").on(table.resource),
  roleResourceIdx: index("role_permissions_role_resource_idx").on(table.role, table.resource),
}));

// ============================================================================
// USER APPROVAL QUEUE TABLE
// ============================================================================

export const UserApprovalQueue = pgTable("user_approval_queue", {
  id: uuid("id").defaultRandom().primaryKey(),
  
  // User Reference
  userId: uuid("user_id").notNull().references(() => Users.id, { onDelete: "cascade" }),
  
  // Request Details
  requestedRole: varchar("requested_role", { length: 50 }).notNull(), // What role they're requesting
  requestedUnit: varchar("requested_unit", { length: 100 }).notNull(), // Which unit they want to join
  justification: text("justification").notNull(), // Why they need access
  
  // Review Status
  status: varchar("status", { length: 50 }).default("pending").notNull(), // 'pending', 'approved', 'rejected'
  reviewedBy: uuid("reviewed_by").references(() => Users.id), // Admin who reviewed
  reviewedAt: timestamp("reviewed_at"), // When reviewed
  reviewNotes: text("review_notes"), // Admin's notes on the decision
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userIdIdx: index("user_approval_queue_user_id_idx").on(table.userId),
  statusIdx: index("user_approval_queue_status_idx").on(table.status),
  createdAtIdx: index("user_approval_queue_created_at_idx").on(table.createdAt),
}));

// ============================================================================
// ADMIN ACTIVITY LOGS TABLE
// ============================================================================

export const AdminActivityLogs = pgTable("admin_activity_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  
  // Admin Reference
  adminId: uuid("admin_id").notNull().references(() => Users.id, { onDelete: "cascade" }),
  
  // Action Details
  action: varchar("action", { length: 100 }).notNull(), // 'approve_user', 'change_role', 'grant_permission', etc.
  targetUserId: uuid("target_user_id").references(() => Users.id, { onDelete: "set null" }), // User affected
  targetResource: varchar("target_resource", { length: 100 }), // What was modified
  
  // Change Tracking
  oldValue: jsonb("old_value").$type<any>(), // Previous state
  newValue: jsonb("new_value").$type<any>(), // New state
  reason: text("reason"), // Reason for the action
  
  // Context
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  
  // Timestamp
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  adminIdIdx: index("admin_activity_logs_admin_id_idx").on(table.adminId),
  actionIdx: index("admin_activity_logs_action_idx").on(table.action),
  targetUserIdIdx: index("admin_activity_logs_target_user_id_idx").on(table.targetUserId),
  createdAtIdx: index("admin_activity_logs_created_at_idx").on(table.createdAt),
}));

// ============================================================================
// TOOL ACCESS REQUESTS TABLE
// ============================================================================

export const ToolAccessRequests = pgTable("tool_access_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  
  // User Reference
  userId: uuid("user_id").notNull().references(() => Users.id, { onDelete: "cascade" }),
  
  // Request Details
  toolName: varchar("tool_name", { length: 100 }).notNull(), // Name of the tool
  toolPath: varchar("tool_path", { length: 255 }), // Route path of the tool
  justification: text("justification").notNull(), // Why they need access
  
  // Review Status
  status: varchar("status", { length: 50 }).default("pending").notNull(), // 'pending', 'approved', 'rejected'
  reviewedBy: uuid("reviewed_by").references(() => Users.id), // Admin who reviewed
  reviewedAt: timestamp("reviewed_at"), // When reviewed
  reviewNotes: text("review_notes"), // Admin's notes
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdIdx: index("tool_access_requests_user_id_idx").on(table.userId),
  statusIdx: index("tool_access_requests_status_idx").on(table.status),
  toolNameIdx: index("tool_access_requests_tool_name_idx").on(table.toolName),
  createdAtIdx: index("tool_access_requests_created_at_idx").on(table.createdAt),
}));

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

export const signupSchema = z.object({
  email: z.string().email("Invalid email address").toLowerCase(),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  requestedUnit: z.string().min(1, "Please select a unit").max(100),
  requestedRole: z.enum(["member", "co-leader", "leader"], {
    errorMap: () => ({ message: "Please select a valid role" })
  }),
  signupJustification: z.string().min(20, "Please provide at least 20 characters explaining why you need access").max(1000),
});

export const signinSchema = z.object({
  email: z.string().email("Invalid email address").toLowerCase(),
  password: z.string().min(1, "Password is required"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address").toLowerCase(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type User = typeof Users.$inferSelect;
export type NewUser = typeof Users.$inferInsert;
export type Session = typeof Sessions.$inferSelect;
export type NewSession = typeof Sessions.$inferInsert;
export type AuditLog = typeof AuditLogs.$inferSelect;
export type NewAuditLog = typeof AuditLogs.$inferInsert;
export type PasswordResetToken = typeof PasswordResetTokens.$inferSelect;
export type EmailVerificationToken = typeof EmailVerificationTokens.$inferSelect;
export type RolePermission = typeof RolePermissions.$inferSelect;
export type NewRolePermission = typeof RolePermissions.$inferInsert;
export type UserApprovalQueueItem = typeof UserApprovalQueue.$inferSelect;
export type NewUserApprovalQueueItem = typeof UserApprovalQueue.$inferInsert;
export type AdminActivityLog = typeof AdminActivityLogs.$inferSelect;
export type NewAdminActivityLog = typeof AdminActivityLogs.$inferInsert;
export type ToolAccessRequest = typeof ToolAccessRequests.$inferSelect;
export type NewToolAccessRequest = typeof ToolAccessRequests.$inferInsert;

// ============================================================================
// NOTIFICATIONS TABLE
// ============================================================================

export const Notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  
  // Recipient
  userId: uuid("user_id").notNull().references(() => Users.id, { onDelete: "cascade" }),
  
  // Notification details
  type: varchar("type", { length: 50 }).notNull(), // 'user_approved', 'user_rejected', 'role_changed', 'tool_access_granted', 'tool_access_denied', 'new_signup', 'new_tool_request', 'security_alert', 'system_error'
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  
  // Related entities
  relatedUserId: uuid("related_user_id").references(() => Users.id, { onDelete: "set null" }),
  relatedResourceType: varchar("related_resource_type", { length: 50 }), // 'user', 'tool_request', 'approval', 'role'
  relatedResourceId: uuid("related_resource_id"),
  
  // Action link
  actionUrl: varchar("action_url", { length: 500 }),
  actionLabel: varchar("action_label", { length: 100 }),
  
  // Status
  isRead: boolean("is_read").default(false).notNull(),
  readAt: timestamp("read_at"),
  
  // Priority
  priority: varchar("priority", { length: 20 }).default("normal").notNull(), // 'low', 'normal', 'high', 'urgent'
  
  // Metadata
  metadata: jsonb("metadata"),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"), // Optional expiry for temporary notifications
}, (table) => ({
  userIdIdx: index("notifications_user_id_idx").on(table.userId),
  typeIdx: index("notifications_type_idx").on(table.type),
  isReadIdx: index("notifications_is_read_idx").on(table.isRead),
  createdAtIdx: index("notifications_created_at_idx").on(table.createdAt),
  priorityIdx: index("notifications_priority_idx").on(table.priority),
}));

export type Notification = typeof Notifications.$inferSelect;
export type NewNotification = typeof Notifications.$inferInsert;

// ============================================================================
// UNITS/DEPARTMENTS TABLE
// ============================================================================

export const Units = pgTable("units", {
  id: uuid("id").defaultRandom().primaryKey(),
  
  // Unit details
  name: varchar("name", { length: 100 }).notNull().unique(),
  description: text("description"),
  code: varchar("code", { length: 20 }).unique(), // e.g., "AI", "VC", "SM"
  
  // Leadership
  leaderId: uuid("leader_id").references(() => Users.id, { onDelete: "set null" }),
  coLeaderId: uuid("co_leader_id").references(() => Users.id, { onDelete: "set null" }),
  
  // Status
  isActive: boolean("is_active").default(true).notNull(),
  
  // Metadata
  color: varchar("color", { length: 7 }), // Hex color for UI
  icon: varchar("icon", { length: 50 }), // Icon name
  memberCount: integer("member_count").default(0),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: uuid("created_by").references(() => Users.id, { onDelete: "set null" }),
}, (table) => ({
  nameIdx: index("units_name_idx").on(table.name),
  codeIdx: index("units_code_idx").on(table.code),
  isActiveIdx: index("units_is_active_idx").on(table.isActive),
}));

export type Unit = typeof Units.$inferSelect;
export type NewUnit = typeof Units.$inferInsert;

// ============================================================================
// ROLE CHANGE HISTORY TABLE
// ============================================================================

export const RoleChangeHistory = pgTable("role_change_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  
  // User and change details
  userId: uuid("user_id").notNull().references(() => Users.id, { onDelete: "cascade" }),
  changedBy: uuid("changed_by").notNull().references(() => Users.id, { onDelete: "cascade" }),
  
  // Change tracking
  oldRole: varchar("old_role", { length: 50 }).notNull(),
  newRole: varchar("new_role", { length: 50 }).notNull(),
  oldUnit: varchar("old_unit", { length: 100 }),
  newUnit: varchar("new_unit", { length: 100 }),
  
  // Context
  reason: text("reason"),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  
  // Timestamp
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("role_change_history_user_id_idx").on(table.userId),
  changedByIdx: index("role_change_history_changed_by_idx").on(table.changedBy),
  createdAtIdx: index("role_change_history_created_at_idx").on(table.createdAt),
}));

export type RoleChangeHistoryEntry = typeof RoleChangeHistory.$inferSelect;
export type NewRoleChangeHistoryEntry = typeof RoleChangeHistory.$inferInsert;

// ============================================================================
// PERMISSION AUDIT TRAIL TABLE
// ============================================================================

export const PermissionAuditTrail = pgTable("permission_audit_trail", {
  id: uuid("id").defaultRandom().primaryKey(),
  
  // Admin who made the change
  adminId: uuid("admin_id").notNull().references(() => Users.id, { onDelete: "cascade" }),
  
  // Permission details
  role: varchar("role", { length: 50 }).notNull(),
  resource: varchar("resource", { length: 100 }).notNull(),
  action: varchar("action", { length: 50 }).notNull(),
  
  // Change tracking
  changeType: varchar("change_type", { length: 50 }).notNull(), // 'created', 'updated', 'deleted'
  oldValue: jsonb("old_value").$type<{ allowed: boolean; conditions?: any }>(),
  newValue: jsonb("new_value").$type<{ allowed: boolean; conditions?: any }>(),
  
  // Context
  reason: text("reason"),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  
  // Timestamp
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  adminIdIdx: index("permission_audit_trail_admin_id_idx").on(table.adminId),
  roleIdx: index("permission_audit_trail_role_idx").on(table.role),
  resourceIdx: index("permission_audit_trail_resource_idx").on(table.resource),
  createdAtIdx: index("permission_audit_trail_created_at_idx").on(table.createdAt),
}));

export type PermissionAuditTrailEntry = typeof PermissionAuditTrail.$inferSelect;
export type NewPermissionAuditTrailEntry = typeof PermissionAuditTrail.$inferInsert;
