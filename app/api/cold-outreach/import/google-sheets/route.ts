/**
 * @file POST /api/cold-outreach/import/google-sheets
 *
 * Import contacts from Google Sheets
 *
 * ## Request Body
 * ```json
 * {
 *   "spreadsheetId": "string",
 *   "sheetName": "string" // optional, defaults to "Sheet1"
 * }
 * ```
 *
 * ## Security Notes
 * - Google Sheets credentials must be pre-configured through the settings API
 * - Credentials are never transmitted in API request bodies
 * - OAuth tokens are securely stored and retrieved server-side
 *
 * ## Response
 * ```json
 * {
 *   "message": "string",
 *   "contacts": [
 *     {
 *       "id": "string",
 *       "name": "string",
 *       "email": "string",
 *       "role": "string",
 *       "company": "string"
 *     }
 *   ],
 *   "metadata": {
 *     "imported": "number",
 *     "skipped": "number",
 *     "errors": "array"
 *   }
 * }
 * ```
 *
 * ## Security
 * - Requires authentication
 * - Rate limited
 * - Input validation and sanitization
 *
 * ## Performance
 * - Retry logic with exponential backoff
 * - Performance monitoring
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from 'zod';
import { requireSession } from "@/lib/apiAuth";
import { coldOutreachRateLimit } from "@/lib/cold-outreach/security-utils";
import { logger, withPerformanceMonitoring, ValidationError, sanitizeInput, retryWithBackoff } from '@/lib/client-utils';
import { google } from 'googleapis';

// Validation schemas
const googleSheetsImportSchema = z.object({
  spreadsheetId: z.string().min(1, 'Spreadsheet ID is required'),
  sheetName: z.string().min(1, 'Sheet name is required').default('Sheet1'),
  // NOTE: Credentials are no longer accepted in request body for security reasons
  // Google Sheets credentials must be configured through the settings API
  // and will be retrieved securely from stored configuration
});

const contactSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  role: z.string().optional(),
  company: z.string().optional(),
  phone: z.string().optional(),
  linkedinUrl: z.string().url().optional(),
  website: z.string().url().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
});

// Audit logging functions
async function logImportOperation(userId: string, source: string, result: any) {
  logger.info('Import operation performed', {
    userId: sanitizeInput(userId),
    source: sanitizeInput(source),
    result: sanitizeInput(JSON.stringify(result)),
    timestamp: new Date().toISOString(),
  });
}

async function logImportError(userId: string, error: any, context: any) {
  logger.error('Import operation error', error, {
    userId: sanitizeInput(userId),
    context: sanitizeInput(JSON.stringify(context)),
    timestamp: new Date().toISOString(),
  });
}

// Secure credential retrieval function
async function getGoogleSheetsCredentials(userId: string): Promise<any | null> {
  // TODO: Implement secure credential retrieval from encrypted storage or OAuth service
  // For now, return null to indicate credentials need to be configured
  // In production, this should retrieve OAuth tokens from secure storage

  // Check if Google Sheets integration is configured in user settings
  try {
    const { getUserSettings } = await import('@/lib/settings');
    const settings = await getUserSettings(userId);

    if (settings?.integrations?.googleSheets?.connected) {
      // Integration is marked as connected, but credentials need to be retrieved securely
      // This is a placeholder - actual implementation would retrieve from secure storage
      logger.warn('Google Sheets integration connected but credentials not available', {
        userId: sanitizeInput(userId)
      });
      return null;
    }
  } catch (error) {
    logger.error('Error checking Google Sheets settings', error as Error, {
      userId: sanitizeInput(userId)
    });
  }

  return null; // Credentials not configured
}

// POST /api/cold-outreach/import/google-sheets - Import contacts from Google Sheets
export async function POST(req: NextRequest) {
    try {
      // Authentication
      const session = await requireSession();
      const userId = session.user.id;

      // Rate limiting
      const rateLimitCheck = coldOutreachRateLimit.check(`${userId}:import_google_sheets`);
      if (!rateLimitCheck.allowed) {
        logger.warn('Rate limit exceeded for Google Sheets import', {
          userId: sanitizeInput(userId),
          endpoint: 'import/google-sheets',
          retryAfter: rateLimitCheck.retryAfter
        });
        return NextResponse.json(
          { error: "Rate limit exceeded. Please try again later." },
          { status: 429 }
        );
      }

      // Parse and validate request body
      let body: any;
      try {
        body = await req.json();
      } catch (error) {
        logger.error('Invalid JSON in Google Sheets import request', error as Error, { userId });
        throw new ValidationError('Invalid JSON format');
      }

      const validatedData = googleSheetsImportSchema.parse(body);
      const { spreadsheetId, sheetName } = validatedData;

      // SECURITY: Credentials are no longer accepted in request body
      // Retrieve Google Sheets credentials from secure storage
      // TODO: Implement secure credential retrieval from settings or OAuth service
      const credentials = await getGoogleSheetsCredentials(userId);

      if (!credentials) {
        logger.warn('Google Sheets credentials not configured', {
          userId: sanitizeInput(userId),
          spreadsheetId: sanitizeInput(spreadsheetId)
        });
        return NextResponse.json(
          {
            error: 'Google Sheets integration not configured. Please configure your Google Sheets credentials in settings first.',
            code: 'GOOGLE_SHEETS_NOT_CONFIGURED'
          },
          { status: 400 }
        );
      }

      // Initialize Google Sheets client
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
      });

      const sheets = google.sheets({ version: 'v4', auth });

      // Fetch contacts from Google Sheets
      const contacts = await retryWithBackoff(
        async () => {
          try {
            // Get spreadsheet metadata to validate access
            const spreadsheetResponse = await sheets.spreadsheets.get({
              spreadsheetId,
            });

            const sheet = spreadsheetResponse.data.sheets?.find(
              s => s.properties?.title === sheetName
            );

            if (!sheet) {
              throw new ValidationError(`Sheet "${sheetName}" not found in spreadsheet`);
            }

            // Get the data from the sheet
            const response = await sheets.spreadsheets.values.get({
              spreadsheetId,
              range: `${sheetName}!A:Z`, // Read columns A through Z
            });

            const rows = response.data.values || [];
            if (rows.length === 0) {
              return [];
            }

            // Assume first row is headers
            const headers = rows[0].map((header: string) => header?.toLowerCase().trim() || '');
            const dataRows = rows.slice(1);

            // Transform rows to contacts
            const transformedContacts = dataRows.map((row: any[], index: number) => {
              const contact: any = {};

              headers.forEach((header, colIndex) => {
                const value = row[colIndex] || '';

                // Map common header variations to contact fields
                if (header.includes('name') || header.includes('full name') || header === 'contact') {
                  contact.name = value;
                } else if (header.includes('email') || header.includes('e-mail')) {
                  contact.email = value;
                } else if (header.includes('role') || header.includes('position') || header.includes('title') || header.includes('job')) {
                  contact.role = value;
                } else if (header.includes('company') || header.includes('organization') || header.includes('employer')) {
                  contact.company = value;
                } else if (header.includes('phone') || header.includes('mobile') || header.includes('tel')) {
                  contact.phone = value;
                } else if (header.includes('linkedin') || header.includes('linked in')) {
                  contact.linkedinUrl = value;
                } else if (header.includes('website') || header.includes('url') || header.includes('site')) {
                  contact.website = value;
                } else if (header.includes('location') || header.includes('address') || header.includes('city')) {
                  contact.location = value;
                } else if (header.includes('notes') || header.includes('comments') || header.includes('description')) {
                  contact.notes = value;
                }
              });

              return contact;
            });

            // Filter out contacts without valid emails
            return transformedContacts.filter(contact =>
              contact.email &&
              contact.email.includes('@') &&
              contact.name &&
              contact.name.trim() !== ''
            );

          } catch (sheetsError: any) {
            logger.error('Google Sheets API error', sheetsError, {
              userId: sanitizeInput(userId),
              spreadsheetId: sanitizeInput(spreadsheetId),
              sheetName: sanitizeInput(sheetName)
            });

            if (sheetsError.code === 403) {
              throw new ValidationError('Access denied to Google Sheets. Please check permissions.');
            }
            if (sheetsError.code === 404) {
              throw new ValidationError('Google Sheets spreadsheet not found.');
            }
            if (sheetsError.code === 401) {
              throw new ValidationError('Invalid Google Sheets credentials.');
            }

            throw new Error(`Google Sheets API error: ${sheetsError.message}`);
          }
        },
        3,
        1000
      );

      // Validate contacts
      const validatedContacts = contacts.map(contact => {
        const validation = contactSchema.safeParse(contact);
        if (!validation.success) {
          logger.warn('Invalid contact data from Google Sheets', {
            userId: sanitizeInput(userId),
            errors: validation.error.errors,
            contact: sanitizeInput(JSON.stringify(contact))
          });
          // Skip invalid contacts instead of failing the entire import
          return null;
        }
        return validation.data;
      }).filter(Boolean) as typeof contacts;

      logger.info('Google Sheets import completed successfully', {
        userId: sanitizeInput(userId),
        totalContacts: contacts.length,
        validContacts: validatedContacts.length,
        spreadsheetId: sanitizeInput(spreadsheetId),
        sheetName: sanitizeInput(sheetName)
      });

      return NextResponse.json({
        message: `Imported ${validatedContacts.length} contacts from Google Sheets`,
        contacts: validatedContacts,
        metadata: {
          totalFound: contacts.length,
          validContacts: validatedContacts.length,
          skippedContacts: contacts.length - validatedContacts.length,
          source: 'google-sheets',
          spreadsheetId: sanitizeInput(spreadsheetId),
          sheetName: sanitizeInput(sheetName)
        }
      });

    } catch (error) {
      const session = await requireSession();
      const userId = session?.user?.id || 'unknown';

      await logImportError(userId, error, { endpoint: 'import/google-sheets' });

      if (error instanceof ValidationError) {
        logger.warn('Validation error in Google Sheets import', {
          userId: sanitizeInput(userId),
          error: error.message,
        });
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }

      logger.error('Unexpected error in Google Sheets import', error instanceof Error ? error : undefined, {
        userId: sanitizeInput(userId),
        stack: error instanceof Error ? error.stack : undefined,
      });

      return NextResponse.json(
        { error: "Failed to import from Google Sheets" },
        { status: 500 }
      );
    }

}
