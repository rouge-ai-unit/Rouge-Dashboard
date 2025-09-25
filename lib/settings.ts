import { getDb } from "@/utils/dbConfig";
import { UserSettings } from "@/utils/schema";
import { eq } from "drizzle-orm";
import { logger, ValidationError, withPerformanceMonitoring } from './client-utils';
import { z } from 'zod';

// Validation schemas
const ProfileSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  company: z.string().min(1).max(100).optional(),
  role: z.string().min(1).max(100).optional(),
  timezone: z.string().min(1).max(50).optional(),
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
  contactUpdates: z.boolean()
});

const SecuritySchema = z.object({
  twoFactorEnabled: z.boolean(),
  sessionTimeout: z.number().min(5).max(480),
  passwordLastChanged: z.string().optional(),
  apiKeys: z.array(z.object({
    id: z.string().uuid(),
    name: z.string().min(1).max(50),
    key: z.string().min(20).max(100),
    createdAt: z.string(),
    lastUsed: z.string().optional()
  })).max(10).optional()
});

const IntegrationsSchema = z.object({
  sendgrid: z.object({
    apiKey: z.string().optional(),
    verified: z.boolean(),
    fromEmail: z.string().email().optional(),
    fromName: z.string().min(1).max(100).optional()
  }),
  googleSheets: z.object({
    connected: z.boolean(),
    spreadsheetId: z.string().optional(),
    sheetName: z.string().min(1).max(100).optional()
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
  language: z.string().min(2).max(5),
  dateFormat: z.string().min(5).max(20),
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
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
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

    // Return defaults for database errors to ensure app functionality
    logger.warn('Returning default settings due to database error', { userId });
    return getDefaultSettings(userId);
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

    // Validate the updates against schema
    const updateValidation = UserSettingsDataSchema.partial().safeParse(updates);
    if (!updateValidation.success) {
      throw new ValidationError(`Invalid update data: ${updateValidation.error.errors.map(e => e.message).join(', ')}`);
    }

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

      // Validate complete settings
      const fullValidation = UserSettingsDataSchema.safeParse(newSettings);
      if (!fullValidation.success) {
        throw new ValidationError(`Invalid settings data: ${fullValidation.error.errors.map(e => e.message).join(', ')}`);
      }

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
  const defaults: UserSettingsData = {
    userId,
    profile: {
      firstName: '',
      lastName: '',
      company: '',
      role: '',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      avatar: '',
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

  // Validate defaults
  const validation = UserSettingsDataSchema.safeParse(defaults);
  if (!validation.success) {
    logger.error('Default settings validation failed', undefined, {
      errors: validation.error.errors
    });
    throw new Error('Invalid default settings configuration');
  }

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
  lastUpdated?: Date;
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
