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
  
  // Role & Permissions
  role: varchar("role", { length: 50 }).default("user"), // 'admin', 'user', 'viewer'
  permissions: jsonb("permissions").$type<string[]>().default([]),
  
  // Status
  status: varchar("status", { length: 50 }).default("active"), // 'active', 'suspended', 'locked', 'pending'
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
