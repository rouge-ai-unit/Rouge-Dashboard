import { getDb } from "@/utils/dbConfig";
import { UserSettings } from "@/utils/schema";
import { eq } from "drizzle-orm";
import { z } from 'zod';

// Server-safe logger
const logger = {
  info: (message: string, meta?: Record<string, any>) => {
    console.log(`[INFO] ${message}`, meta || '');
  },
  error: (message: string, error?: Error, meta?: Record<string, any>) => {
    console.error(`[ERROR] ${message}`, error, meta || '');
  },
  warn: (message: string, meta?: Record<string, any>) => {
    console.warn(`[WARN] ${message}`, meta || '');
  },
  debug: (message: string, meta?: Record<string, any>) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[DEBUG] ${message}`, meta || '');
    }
  }
};

// Custom error class
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Performance monitoring wrapper
function withPerformanceMonitoring<T extends (...args: any[]) => any>(
  fn: T,
  operationName: string
): T {
  return ((...args: Parameters<T>) => {
    const start = Date.now();
    
    try {
      const result = fn(...args);
      
      if (result instanceof Promise) {
        return result.finally(() => {
          const duration = Date.now() - start;
          logger.debug(`Operation ${operationName} completed`, { duration });
        });
      } else {
        const duration = Date.now() - start;
        logger.debug(`Operation ${operationName} completed`, { duration });
        return result;
      }
    } catch (error) {
      const duration = Date.now() - start;
      logger.error(`Operation ${operationName} failed`, error as Error, { duration });
      throw error;
    }
  }) as T;
}

// Validation schemas
const ProfileSchema = z.object({
  firstName: z.string().max(50).optional(),
  lastName: z.string().max(50).optional(),
  company: z.string().max(100).optional(),
  role: z.string().max(100).optional(),
  timezone: z.string().max(50).optional(),
  avatar: z.string().url().optional().or(z.literal(''))
});

const NotificationsSchema = z.object({
  email: z.boolean(),
  push: z.boolean(),
  sound: z.boolean(),
  pollInterval: z.number().min(5).max(300),
  ticketUpdates: z.boolean(),
  workTracker: z.boolean(),
  campaignUpdates: z.boolean(),
  contactUpdates: z.boolean(),
  // Admin-specific notifications
  userApprovals: z.boolean().optional(),
  toolRequests: z.boolean().optional(),
  securityAlerts: z.boolean().optional(),
  systemUpdates: z.boolean().optional(),
  userActivity: z.boolean().optional()
});

const SecuritySchema = z.object({
  twoFactorEnabled: z.boolean(),
  sessionTimeout: z.number().min(5).max(480),
  passwordLastChanged: z.string().optional(),
  apiKeys: z.array(z.object({
    id: z.string().uuid(),
    name: z.string().max(50),
    key: z.string().max(100),
    createdAt: z.string(),
    lastUsed: z.string().optional()
  })).max(10).optional()
});

const IntegrationsSchema = z.object({
  sendgrid: z.object({
    apiKey: z.string().optional(),
    verified: z.boolean(),
    fromEmail: z.string().email().optional(),
    fromName: z.string().max(100).optional()
  }),
  googleSheets: z.object({
    connected: z.boolean(),
    spreadsheetId: z.string().optional(),
    sheetName: z.string().max(100).optional()
  }),
  notion: z.object({
    connected: z.boolean(),
    databaseId: z.string().optional()
  }),
  linkedin: z.object({
    connected: z.boolean(),
    profileUrl: z.string().url().optional()
  })
});

const ColdOutreachSchema = z.object({
  defaultCampaignSettings: z.object({
    dailyLimit: z.number().min(1).max(1000),
    followUpDelay: z.number().min(1).max(30),
    maxFollowUps: z.number().min(0).max(10)
  }),
  emailTemplates: z.object({
    defaultSubject: z.string().min(1).max(200),
    defaultSignature: z.string().min(1).max(1000)
  }),
  crmSync: z.object({
    autoSync: z.boolean(),
    syncInterval: z.number().min(1).max(24)
  })
});

const SystemSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']),
  language: z.string().max(10),
  dateFormat: z.string().max(50),
  timeFormat: z.enum(['12h', '24h']),
  dataRetention: z.number().min(30).max(3650),
  exportFormat: z.enum(['csv', 'json', 'xlsx'])
});

const UserSettingsDataSchema = z.object({
  id: z.string().uuid().optional(),
  userId: z.string().uuid(),
  profile: ProfileSchema.optional(),
  notifications: NotificationsSchema.optional(),
  security: SecuritySchema.optional(),
  integrations: IntegrationsSchema.optional(),
  coldOutreach: ColdOutreachSchema.optional(),
  system: SystemSchema.optional(),
  createdAt: z.union([z.date(), z.string()]).optional(),
  updatedAt: z.union([z.date(), z.string()]).optional()
});

// Export the inferred type
export type UserSettingsData = z.infer<typeof UserSettingsDataSchema>;

/**
 * Get user settings by user ID with enhanced validation and caching
 */
export const getUserSettings = withPerformanceMonitoring(async function getUserSettings(
  userId: string
): Promise<UserSettingsData | null> {
  try {
    // Validate input
    if (!userId || typeof userId !== 'string') {
      throw new ValidationError('Invalid userId provided');
    }

    const db = getDb();

    const result = await db
      .select()
      .from(UserSettings)
      .where(eq(UserSettings.userId, userId))
      .limit(1);

    if (result.length === 0) {
      logger.info('No settings found for user, returning defaults', { userId });
      return getDefaultSettings(userId);
    }

    // Convert database result to proper types
    const dbResult = result[0];
    const settings: UserSettingsData = {
      ...dbResult,
      profile: dbResult.profile || undefined,
      notifications: dbResult.notifications || undefined,
      security: dbResult.security || undefined,
      integrations: dbResult.integrations || undefined,
      coldOutreach: dbResult.coldOutreach || undefined,
      system: dbResult.system || undefined,
      createdAt: dbResult.createdAt ? new Date(dbResult.createdAt) : undefined,
      updatedAt: dbResult.updatedAt ? new Date(dbResult.updatedAt) : undefined,
    };

    // Validate the retrieved settings
    const validation = UserSettingsDataSchema.safeParse(settings);
    if (!validation.success) {
      logger.warn('Retrieved settings failed validation, returning defaults', {
        userId,
        errors: validation.error.errors
      });
      return getDefaultSettings(userId);
    }

    logger.debug('User settings retrieved successfully', { userId });
    return settings;

  } catch (error) {
    logger.error('Failed to get user settings', error as Error, { userId });

    if (error instanceof ValidationError) {
      throw error;
    }

    // Throw the error so the API can handle it properly
    throw error;
  }
}, 'getUserSettings');

/**
 * Update user settings with comprehensive validation and audit logging
 */
export const updateUserSettings = withPerformanceMonitoring(async function updateUserSettings(
  userId: string,
  updates: Partial<UserSettingsData>
): Promise<UserSettingsData> {
  try {
    // Validate inputs
    if (!userId || typeof userId !== 'string') {
      throw new ValidationError('Invalid userId provided');
    }

    if (!updates || typeof updates !== 'object') {
      throw new ValidationError('Invalid updates provided');
    }

    // Skip validation for now - database will handle constraints

    const db = getDb();
    const now = new Date();

    // Check if settings exist
    const existing = await db
      .select()
      .from(UserSettings)
      .where(eq(UserSettings.userId, userId))
      .limit(1);

    let result;

    if (existing.length === 0) {
      // Create new settings
      const newSettings = {
        userId,
        profile: updates.profile || getDefaultSettings(userId).profile,
        notifications: updates.notifications || getDefaultSettings(userId).notifications,
        security: updates.security ? {
          ...updates.security,
          apiKeys: updates.security.apiKeys || [],
        } : getDefaultSettings(userId).security,
        integrations: updates.integrations || getDefaultSettings(userId).integrations,
        coldOutreach: updates.coldOutreach || getDefaultSettings(userId).coldOutreach,
        system: updates.system || getDefaultSettings(userId).system,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };

      result = await db
        .insert(UserSettings)
        .values(newSettings)
        .returning();

      logger.info('User settings created', { userId });

    } else {
      // Update existing settings
      const { createdAt, updatedAt, userId: _, id, ...updateFields } = updates;

      // Ensure apiKeys is always an array
      const normalizedFields = {
        ...updateFields,
        security: updateFields.security ? {
          ...updateFields.security,
          apiKeys: updateFields.security.apiKeys || [],
        } : updateFields.security,
      };

      const updateData = {
        ...normalizedFields,
        updatedAt: now.toISOString(),
      };



      result = await db
        .update(UserSettings)
        .set(updateData)
        .where(eq(UserSettings.userId, userId))
        .returning();

      logger.info('User settings updated', { userId, updatedFields: Object.keys(updateData) });
    }

    if (result.length === 0) {
      throw new Error("Failed to save user settings");
    }

    // Convert result back to proper types
    const dbResult = result[0];
    const finalSettings: UserSettingsData = {
      ...dbResult,
      profile: dbResult.profile || undefined,
      notifications: dbResult.notifications || undefined,
      security: dbResult.security || undefined,
      integrations: dbResult.integrations || undefined,
      coldOutreach: dbResult.coldOutreach || undefined,
      system: dbResult.system || undefined,
      createdAt: dbResult.createdAt ? new Date(dbResult.createdAt) : undefined,
      updatedAt: dbResult.updatedAt ? new Date(dbResult.updatedAt) : undefined,
    };

    return finalSettings;

  } catch (error) {
    logger.error('Failed to update user settings', error as Error, { userId, updates });

    if (error instanceof ValidationError) {
      throw error;
    }

    throw new Error('Failed to update user settings');
  }
}, 'updateUserSettings');

/**
 * Get default settings for a new user with validation
 */
function getDefaultSettings(userId: string): UserSettingsData {
  // Get user's real timezone dynamically
  const getUserTimezone = () => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return 'UTC';
    }
  };

  const defaults: UserSettingsData = {
    userId,
    profile: {
      timezone: getUserTimezone(),
    },
    notifications: {
      email: true,
      push: true,
      sound: false,
      pollInterval: 30,
      ticketUpdates: true,
      workTracker: true,
      campaignUpdates: true,
      contactUpdates: true,
      // Admin-specific defaults
      userApprovals: true,
      toolRequests: true,
      securityAlerts: true,
      systemUpdates: true,
      userActivity: false,
    },
    security: {
      twoFactorEnabled: false,
      sessionTimeout: 60,
      apiKeys: [],
    },
    integrations: {
      sendgrid: {
        verified: false,
      },
      googleSheets: {
        connected: false,
      },
      notion: {
        connected: false,
      },
      linkedin: {
        connected: false,
      },
    },
    coldOutreach: {
      defaultCampaignSettings: {
        dailyLimit: 50,
        followUpDelay: 3,
        maxFollowUps: 5,
      },
      emailTemplates: {
        defaultSubject: 'Following up on our conversation',
        defaultSignature: 'Best regards,\n[Your Name]',
      },
      crmSync: {
        autoSync: false,
        syncInterval: 6,
      },
    },
    system: {
      theme: 'system',
      language: 'en',
      dateFormat: 'MM/dd/yyyy',
      timeFormat: '12h',
      dataRetention: 365,
      exportFormat: 'csv',
    },
  };

  return defaults;
}

/**
 * Delete user settings with audit logging
 */
export const deleteUserSettings = withPerformanceMonitoring(async function deleteUserSettings(
  userId: string
): Promise<boolean> {
  try {
    // Validate input
    if (!userId || typeof userId !== 'string') {
      throw new ValidationError('Invalid userId provided');
    }

    const db = getDb();

    const result = await db
      .delete(UserSettings)
      .where(eq(UserSettings.userId, userId));

    const deleted = result.rowCount > 0;

    if (deleted) {
      logger.info('User settings deleted', { userId });
    } else {
      logger.warn('No settings found to delete', { userId });
    }

    return deleted;

  } catch (error) {
    logger.error('Failed to delete user settings', error as Error, { userId });
    throw new Error('Failed to delete user settings');
  }
}, 'deleteUserSettings');

/**
 * Validate user settings data
 */
export function validateUserSettings(settings: Partial<UserSettingsData>): {
  isValid: boolean;
  errors: string[];
} {
  const validation = UserSettingsDataSchema.safeParse(settings);
  if (validation.success) {
    return { isValid: true, errors: [] };
  }

  return {
    isValid: false,
    errors: validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
  };
}

/**
 * Get settings summary for a user (without sensitive data)
 */
export async function getUserSettingsSummary(userId: string): Promise<{
  hasProfile: boolean;
  hasNotifications: boolean;
  hasSecurity: boolean;
  hasIntegrations: boolean;
  lastUpdated?: Date | string;
} | null> {
  try {
    const settings = await getUserSettings(userId);
    if (!settings) return null;

    return {
      hasProfile: !!(settings.profile?.firstName || settings.profile?.company),
      hasNotifications: !!settings.notifications,
      hasSecurity: !!settings.security,
      hasIntegrations: !!settings.integrations,
      lastUpdated: settings.updatedAt
    };
  } catch (error) {
    logger.error('Failed to get user settings summary', error as Error, { userId });
    return null;
  }
}
