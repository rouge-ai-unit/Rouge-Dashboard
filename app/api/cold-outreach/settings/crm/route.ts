import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireSession } from '@/lib/apiAuth';
import { coldOutreachRateLimit } from '@/lib/rate-limit';
import { logger, withPerformanceMonitoring, ValidationError, sanitizeInput, retryWithBackoff } from '@/lib/client-utils';
import { getDb } from '@/utils/dbConfig';
import { eq } from 'drizzle-orm';

/**
 * @swagger
 * /api/cold-outreach/settings/crm:
 *   get:
 *     summary: Get CRM integration settings
 *     description: Retrieves CRM integration settings for the authenticated user
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: CRM settings retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 notion:
 *                   type: object
 *                   properties:
 *                     apiKey:
 *                       type: string
 *                     databaseId:
 *                       type: string
 *                     connected:
 *                       type: boolean
 *                 google:
 *                   type: object
 *                   properties:
 *                     spreadsheetId:
 *                       type: string
 *                     sheetName:
 *                       type: string
 *                     credentials:
 *                       type: string
 *                     connected:
 *                       type: boolean
 *   post:
 *     summary: Update CRM integration settings
 *     description: Updates CRM integration settings for the authenticated user
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notion:
 *                 type: object
 *                 properties:
 *                   apiKey:
 *                     type: string
 *                   databaseId:
 *                     type: string
 *                   connected:
 *                     type: boolean
 *               google:
 *                 type: object
 *                 properties:
 *                   spreadsheetId:
 *                     type: string
 *                   sheetName:
 *                     type: string
 *                   credentials:
 *                     type: string
 *                   connected:
 *                     type: boolean
 *     responses:
 *       200:
 *         description: CRM settings updated successfully
 *       400:
 *         description: Invalid request parameters
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         description: Internal server error
 */

// Validation schemas
const crmSettingsSchema = z.object({
  notion: z.object({
    apiKey: z.string().optional(),
    databaseId: z.string().optional(),
    connected: z.boolean().optional().default(false),
  }).optional().default({}),
  google: z.object({
    spreadsheetId: z.string().optional(),
    sheetName: z.string().optional(),
    credentials: z.string().optional(),
    connected: z.boolean().optional().default(false),
  }).optional().default({}),
});

// In-memory storage for demo - in production, use database
const crmSettings = new Map<string, any>();

// Audit logging functions
async function logSettingsAccess(userId: string, action: string) {
  logger.info('CRM settings accessed', {
    userId: sanitizeInput(userId),
    action: sanitizeInput(action),
    timestamp: new Date().toISOString(),
  });
}

async function logSettingsError(userId: string, error: any, context: any) {
  logger.error('CRM settings error', error, {
    userId: sanitizeInput(userId),
    context: sanitizeInput(JSON.stringify(context)),
    timestamp: new Date().toISOString(),
  });
}

export async function GET(request: NextRequest) {
    try {
      // Authentication
      const session = await requireSession();
      const userId = session.user.id;

      // Rate limiting
      const rateLimitCheck = coldOutreachRateLimit.check(`${userId}:settings_read`);
      if (!rateLimitCheck.allowed) {
        logger.warn('Rate limit exceeded for CRM settings read', {
          userId: sanitizeInput(userId),
          endpoint: 'settings/crm',
          retryAfter: rateLimitCheck.retryAfter
        });
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please try again later.' },
          { status: 429 }
        );
      }

      // Get settings with retry logic
      const settings = await retryWithBackoff(
        async () => {
          return crmSettings.get(userId) || {
            notion: {
              apiKey: '',
              databaseId: '',
              connected: false
            },
            google: {
              spreadsheetId: '',
              sheetName: '',
              credentials: '',
              connected: false
            }
          };
        },
        2,
        500
      );

      // Log successful access
      await logSettingsAccess(userId, 'read');

      logger.info('CRM settings retrieved successfully', {
        userId: sanitizeInput(userId),
        hasNotionSettings: !!settings.notion?.apiKey,
        hasGoogleSettings: !!settings.google?.spreadsheetId,
      });

      return NextResponse.json(settings);

    } catch (error) {
      // userId was already captured at the beginning of the function
      const userId = 'unknown';
      await logSettingsError(userId, error, { endpoint: 'settings/crm', method: 'GET' });

      logger.error('Unexpected error in CRM settings GET', error instanceof Error ? error : undefined, {
        userId: sanitizeInput(userId),
        stack: error instanceof Error ? error.stack : undefined,
      });

      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }

}

export async function POST(request: NextRequest) {
    try {
      // Authentication
      const session = await requireSession();
      const userId = session.user.id;

      // Rate limiting
      const rateLimitCheck = coldOutreachRateLimit.check(`${userId}:settings_write`);
      if (!rateLimitCheck.allowed) {
        logger.warn('Rate limit exceeded for CRM settings write', {
          userId: sanitizeInput(userId),
          endpoint: 'settings/crm',
          retryAfter: rateLimitCheck.retryAfter
        });
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please try again later.' },
          { status: 429 }
        );
      }

      // Parse and validate request body
      const body = await request.json();
      const validation = crmSettingsSchema.safeParse(body);
      if (!validation.success) {
        logger.warn('Invalid CRM settings data', {
          userId: sanitizeInput(userId),
          errors: validation.error.errors,
        });
        throw new ValidationError(`Invalid settings data: ${validation.error.errors.map(e => e.message).join(', ')}`);
      }

      const validatedSettings = validation.data;

      // Store settings with retry logic
      await retryWithBackoff(
        async () => {
          crmSettings.set(userId, validatedSettings);
        },
        2,
        500
      );

      // Log successful update
      await logSettingsAccess(userId, 'write');

      logger.info('CRM settings updated successfully', {
        userId: sanitizeInput(userId),
        hasNotionSettings: !!validatedSettings.notion?.apiKey,
        hasGoogleSettings: !!validatedSettings.google?.spreadsheetId,
      });

      return NextResponse.json({
        success: true,
        message: 'CRM settings saved successfully',
        metadata: {
          updatedAt: new Date().toISOString(),
          userId: sanitizeInput(userId),
        }
      });

    } catch (error) {
      const session = await requireSession();
      const userId = session?.user?.id || 'unknown';

      await logSettingsError(userId, error, { endpoint: 'settings/crm', method: 'POST' });

      if (error instanceof ValidationError) {
        logger.warn('Validation error in CRM settings POST', {
          userId: sanitizeInput(userId),
          error: error.message,
        });
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }

      logger.error('Unexpected error in CRM settings POST', error instanceof Error ? error : undefined, {
        userId: sanitizeInput(userId),
        stack: error instanceof Error ? error.stack : undefined,
      });

      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }

}
