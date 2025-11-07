/**
 * Permission Checking Utilities
 * Dynamic permission checks against database with caching
 */

import { getDb } from '@/utils/dbConfig';
import { RolePermissions, Users } from '@/utils/auth-schema';
import { eq, and } from 'drizzle-orm';

// Permission cache to improve performance
const permissionCache = new Map<string, { allowed: boolean; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Clear permission cache for a user
 */
export function clearPermissionCache(userId: string): void {
  const keysToDelete: string[] = [];
  permissionCache.forEach((_, key) => {
    if (key.startsWith(`${userId}:`)) {
      keysToDelete.push(key);
    }
  });
  keysToDelete.forEach(key => permissionCache.delete(key));
}

/**
 * Clear all permission cache
 */
export function clearAllPermissionCache(): void {
  permissionCache.clear();
}

/**
 * Check if a user has permission to access a resource (with caching)
 */
export async function checkPermission(
  userId: string,
  resource: string,
  action: string = 'execute'
): Promise<boolean> {
  try {
    // Check cache first
    const cacheKey = `${userId}:${resource}:${action}`;
    const cached = permissionCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.allowed;
    }
    
    const db = getDb();
    
    // Get user
    const [user] = await db.select().from(Users).where(eq(Users.id, userId)).limit(1);
    
    if (!user) {
      permissionCache.set(cacheKey, { allowed: false, timestamp: Date.now() });
      return false;
    }
    
    // Check if user is approved
    if (!user.isApproved) {
      permissionCache.set(cacheKey, { allowed: false, timestamp: Date.now() });
      return false;
    }
    
    // Check if user is active
    if (!user.isActive || user.status !== 'active') {
      permissionCache.set(cacheKey, { allowed: false, timestamp: Date.now() });
      return false;
    }
    
    // Admins have all permissions
    if (user.role === 'admin') {
      permissionCache.set(cacheKey, { allowed: true, timestamp: Date.now() });
      return true;
    }
    
    // Check role permissions
    if (!user.role) {
      permissionCache.set(cacheKey, { allowed: false, timestamp: Date.now() });
      return false;
    }
    
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
    
    const allowed = permission?.allowed || false;
    permissionCache.set(cacheKey, { allowed, timestamp: Date.now() });
    
    return allowed;
  } catch (error) {
    console.error('[Permissions] Error checking permission:', error);
    return false;
  }
}

/**
 * Check multiple permissions at once
 */
export async function checkPermissions(
  userId: string,
  checks: Array<{ resource: string; action: string }>
): Promise<Record<string, boolean>> {
  const results: Record<string, boolean> = {};
  
  await Promise.all(
    checks.map(async ({ resource, action }) => {
      const key = `${resource}:${action}`;
      results[key] = await checkPermission(userId, resource, action);
    })
  );
  
  return results;
}

/**
 * Check if user has permission with detailed response
 */
export async function hasPermission(
  userId: string,
  resource: string,
  action: string = 'execute'
): Promise<{ allowed: boolean; reason?: string }> {
  try {
    const db = getDb();
    
    // Get user
    const [user] = await db.select().from(Users).where(eq(Users.id, userId)).limit(1);
    
    if (!user) {
      return { allowed: false, reason: 'User not found' };
    }
    
    if (!user.isApproved) {
      return { allowed: false, reason: 'Account pending approval' };
    }
    
    if (!user.isActive || user.status !== 'active') {
      return { allowed: false, reason: 'Account is not active' };
    }
    
    if (user.role === 'admin') {
      return { allowed: true, reason: 'Admin has full access' };
    }
    
    if (!user.role) {
      return { allowed: false, reason: 'No role assigned' };
    }
    
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
    
    if (!permission) {
      return { allowed: false, reason: 'Permission not defined for this role' };
    }
    
    return {
      allowed: permission.allowed,
      reason: permission.allowed ? 'Permission granted' : 'Permission denied by policy'
    };
  } catch (error) {
    console.error('[Permissions] Error checking permission:', error);
    return { allowed: false, reason: 'Error checking permission' };
  }
}

/**
 * Check if user can access a tool
 */
export async function canAccessTool(userId: string, toolPath: string): Promise<boolean> {
  return checkPermission(userId, toolPath, 'execute');
}

/**
 * Get user's role from database
 */
export async function getUserRole(userId: string): Promise<string | null> {
  try {
    const db = getDb();
    const [user] = await db.select({ role: Users.role }).from(Users).where(eq(Users.id, userId)).limit(1);
    return user?.role || null;
  } catch (error) {
    console.error('[Permissions] Error getting user role:', error);
    return null;
  }
}

/**
 * Check if user is admin
 */
export async function isAdmin(userId: string): Promise<boolean> {
  const role = await getUserRole(userId);
  return role === 'admin';
}

/**
 * Get all accessible tools for a user
 */
export async function getAccessibleTools(userId: string): Promise<string[]> {
  try {
    const db = getDb();
    
    // Get user
    const [user] = await db.select().from(Users).where(eq(Users.id, userId)).limit(1);
    
    if (!user) return [];
    
    // Admins can access all tools
    if (user.role === 'admin') {
      return ['*']; // Special marker for all tools
    }
    
    // Get tools user can execute
    if (!user.role) return [];
    
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
    
    return permissions.map(p => p.resource);
  } catch (error) {
    console.error('[Permissions] Error getting accessible tools:', error);
    return [];
  }
}

/**
 * Tool definitions with paths
 */
export const TOOLS = {
  AI_TOOLS_REQUEST: '/tools/ai-tools-request-form',
  WORK_TRACKER: '/tools/work-tracker',
  AI_NEWS_DAILY: '/tools/ai-news-daily',
  STARTUP_SEEKER: '/tools/startup-seeker',
  AGTECH_EVENTS: '/agtech-events',
  AGRITECH_UNIVERSITIES: '/tools/agritech-universities',
  SENTIMENT_ANALYZER: '/tools/sentiment-analyzer',
  CONTENT_IDEA_AUTOMATION: '/tools/content-idea-automation',
  COLD_CONNECT_AUTOMATOR: '/tools/cold-connect-automator',
  AI_OUTREACH_AGENT: '/tools/ai-outreach-agent',
  CONTACT: '/tools/contact',
} as const;

/**
 * Admin routes
 */
export const ADMIN_ROUTES = [
  '/admin/dashboard',
  '/admin/approvals',
  '/admin/users',
  '/admin/permissions',
  '/admin/tool-requests',
  '/admin/activity-logs',
] as const;

/**
 * Check if route is admin-only
 */
export function isAdminRoute(path: string): boolean {
  return path.startsWith('/admin');
}

/**
 * Check if route is a tool route
 */
export function isToolRoute(path: string): boolean {
  return path.startsWith('/tools') || path === '/agtech-events';
}
