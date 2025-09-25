import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireSession } from '@/lib/apiAuth';
import { coldOutreachRateLimit } from '@/lib/rate-limit';
import { logger, withPerformanceMonitoring, ValidationError, sanitizeInput, retryWithBackoff } from '@/lib/client-utils';
import { getDb } from '@/utils/dbConfig';
import { Contacts } from '@/utils/schema';
import { eq, and } from 'drizzle-orm';
import { Client as NotionClient } from '@notionhq/client';
import { google } from 'googleapis';

/**
 * @swagger
 * /api/cold-outreach/crm:
 *   post:
 *     summary: CRM integration operations
 *     description: Handle CRM sync, export, and connection testing operations
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - action
 *               - provider
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [sync_contacts, export_contacts, test_connection]
 *               provider:
 *                 type: string
 *                 enum: [notion, google_sheets]
 *               config:
 *                 type: object
 *     responses:
 *       200:
 *         description: Operation completed successfully
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
const crmRequestSchema = z.object({
  action: z.enum(['sync_contacts', 'export_contacts', 'test_connection']),
  provider: z.enum(['notion', 'google_sheets']),
  config: z.record(z.any()).optional(),
});

const contactDataSchema = z.object({
  name: z.string().optional(),
  email: z.string().min(1, "Email is required").email(),
  role: z.string().optional(),
  company: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  linkedinUrl: z.string().url().optional(),
  website: z.string().url().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
});

// Helper function for URL validation
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return url.startsWith('http://') || url.startsWith('https://');
  } catch {
    return false;
  }
}

async function logCrmError(userId: string, error: any, context: any) {
  logger.error(
    'CRM operation error',
    error as Error | undefined,
    {
      userId: sanitizeInput(userId),
      context: sanitizeInput(JSON.stringify(context)),
      timestamp: new Date().toISOString(),
    }
  );
}

export async function POST(request: NextRequest) {
    let userId: string = 'unknown';

    try {
      // Authentication
      const session = await requireSession();
      userId = session.user.id;

      // Rate limiting
      const rateLimitCheck = coldOutreachRateLimit.check(`${userId}:crm_sync`);
      if (!rateLimitCheck.allowed) {
        logger.warn('Rate limit exceeded for CRM operations', {
          userId: sanitizeInput(userId),
          endpoint: 'crm',
          retryAfter: rateLimitCheck.retryAfter
        });
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please try again later.' },
          { status: 429 }
        );
      }

      // Parse and validate request body
      const body = await request.json();
      const validation = crmRequestSchema.safeParse(body);
      if (!validation.success) {
        logger.warn('Invalid CRM request parameters', {
          userId: sanitizeInput(userId),
          errors: validation.error.errors,
        });
        throw new ValidationError(`Invalid request parameters: ${validation.error.errors.map(e => e.message).join(', ')}`);
      }

      const { action, provider, config } = validation.data;

      const db = getDb();

      // Execute action with retry logic
      const result = await retryWithBackoff(
        async () => {
          switch (action) {
            case 'sync_contacts':
              return await syncContacts(db, userId, provider, config);
            case 'export_contacts':
              return await exportContacts(db, userId, provider, config);
            case 'test_connection':
              return await testConnection(provider, config);
            default:
              throw new ValidationError('Invalid action');
          }
        },
        3,
        1000
      );

      // Log successful operation
      logger.info(`CRM ${action}`, {
        userId,
        action,
        resource: 'crm',
        provider,
        result: sanitizeInput(JSON.stringify(result)),
        timestamp: new Date().toISOString()
      });

      logger.info('CRM operation completed successfully', {
        userId: sanitizeInput(userId),
        action,
        provider,
        result: sanitizeInput(JSON.stringify(result)),
      });

      return NextResponse.json({
        success: true,
        message: 'CRM operation completed successfully',
        metadata: {
          provider,
          timestamp: new Date().toISOString(),
        }
      });

    } catch (error) {
      // userId is already set to 'unknown' or the actual user id
      await logCrmError(userId, error, { endpoint: 'crm', action: 'unknown' });

      if (error instanceof ValidationError) {
        logger.warn('Validation error in CRM operation', {
          userId: sanitizeInput(userId),
          error: error.message,
        });
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }

      logger.error('Unexpected error in CRM operation', error instanceof Error ? error : undefined, {
        userId: sanitizeInput(userId),
        stack: error instanceof Error ? error.stack : undefined,
      });

      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
}

async function syncContacts(db: any, userId: string, provider: string, config: any) {
  try {
    // Fetch contacts from provider with validation
    const contacts = await retryWithBackoff(
      async () => {
        switch (provider) {
          case 'notion':
            return await syncFromNotion(config);
          case 'google_sheets':
            return await syncFromGoogleSheets(config);
          default:
            throw new ValidationError('Unsupported provider');
        }
      },
      2,
      2000
    );

    // Validate contact data
    const validatedContacts = contacts.map((contact: any) => {
      const validation = contactDataSchema.safeParse(contact);
      if (!validation.success) {
        logger.warn('Invalid contact data during sync', {
          userId: sanitizeInput(userId),
          errors: validation.error.errors,
          contact: sanitizeInput(JSON.stringify(contact)),
        });
        throw new ValidationError(`Invalid contact data: ${validation.error.errors.map(e => e.message).join(', ')}`);
      }
      return validation.data;
    });

    // Process and import contacts
    const results = {
      total: validatedContacts.length,
      imported: 0,
      updated: 0,
      skipped: 0,
      errors: [] as Array<{email: string, error: string}>
    };

    for (const contactData of validatedContacts) {
      try {
        // Check if contact already exists (filter by userId)
        const existingContact = await db.select()
          .from(Contacts)
          .where(
            and(
              eq(Contacts.email, contactData.email),
              eq(Contacts.userId, userId)
            )
          )
          .limit(1);

        if (existingContact.length > 0) {
          // Update existing contact
          await db.update(Contacts)
            .set({
              name: contactData.name,
              role: contactData.role,
              company: contactData.company,
              firstName: contactData.firstName,
              lastName: contactData.lastName,
              linkedinUrl: contactData.linkedinUrl,
              website: contactData.website,
              location: contactData.location,
              notes: contactData.notes,
              updatedAt: new Date()
            })
            .where(eq(Contacts.id, existingContact[0].id));

          results.updated++;
        } else {
          // Create new contact
          await db.insert(Contacts).values({
            name: contactData.name,
            email: contactData.email,
            role: contactData.role,
            company: contactData.company,
            firstName: contactData.firstName,
            lastName: contactData.lastName,
            linkedinUrl: contactData.linkedinUrl,
            website: contactData.website,
            location: contactData.location,
            notes: contactData.notes,
            userId
          });

          results.imported++;
        }
      } catch (error) {
        logger.error('Error importing contact during sync', error instanceof Error ? error : undefined, {
          userId: sanitizeInput(userId),
          email: sanitizeInput(contactData.email),
        });
        results.errors.push({
          email: contactData.email,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        results.skipped++;
      }
    }

    return NextResponse.json({
      success: true,
      results,
      message: `Sync completed: ${results.imported} imported, ${results.updated} updated, ${results.skipped} skipped`,
      metadata: {
        provider,
        userId: sanitizeInput(userId),
        timestamp: new Date().toISOString(),
      }
    });
  } catch (error) {
    logger.error('Sync contacts error', error instanceof Error ? error : undefined, {
      userId: sanitizeInput(userId),
      provider,
    });
    throw error;
  }
}

async function exportContacts(db: any, userId: string, provider: string, config: any) {
  try {
    // Get all user contacts with retry
    const contacts = await retryWithBackoff(
      async () => {
        return await db.select().from(Contacts).where(eq(Contacts.userId, userId));
      },
      2,
      1000
    );

    // Export to provider
    const result = await retryWithBackoff(
      async () => {
        switch (provider) {
          case 'notion':
            return await exportToNotion(contacts, config);
          case 'google_sheets':
            return await exportToGoogleSheets(contacts, config);
          default:
            throw new ValidationError('Unsupported provider');
        }
      },
      2,
      2000
    );

    return NextResponse.json({
      success: true,
      message: `Exported ${contacts.length} contacts to ${provider}`,
      metadata: {
        provider,
        userId: sanitizeInput(userId),
        contactCount: contacts.length,
        timestamp: new Date().toISOString(),
      }
    });
  } catch (error) {
    logger.error('Export contacts error', error instanceof Error ? error : undefined, {
      userId: sanitizeInput(userId),
      provider,
    });
    throw error;
  }
}

async function testConnection(provider: string, config: any) {
  try {
    const result = await retryWithBackoff(
      async () => {
        switch (provider) {
          case 'notion':
            return await testNotionConnection(config);
          case 'google_sheets':
            return await testGoogleSheetsConnection(config);
          default:
            throw new ValidationError('Unsupported provider');
        }
      },
      1,
      1000
    );

    return NextResponse.json({
      success: true,
      message: `${provider} connection successful`,
      metadata: {
        provider,
        timestamp: new Date().toISOString(),
      }
    });
  } catch (error) {
    logger.error('Test connection error', error instanceof Error ? error : undefined, {
      provider,
    });
    throw error;
  }
}

// Notion integration functions
async function syncFromNotion(config: any) {
  const { apiKey, databaseId } = config;

  if (!apiKey || !databaseId) {
    throw new ValidationError('Notion API key and database ID are required');
  }

  const notion = new NotionClient({ auth: apiKey });

  try {
    // Query the Notion database with pagination support
    let allResults: any[] = [];
    let hasMore = true;
    let startCursor: string | undefined = undefined;

    while (hasMore) {
      const response: any = await (notion.databases as any).query({
        database_id: databaseId,
        filter: {
          and: [
            {
              property: 'Email',
              email: {
                is_not_empty: true
              }
            }
          ]
        },
        start_cursor: startCursor,
        page_size: 100 // Notion's max page size
      });

      allResults = allResults.concat(response.results);
      hasMore = response.has_more;
      startCursor = response.next_cursor;

      // Add small delay between requests to avoid rate limits
      if (hasMore) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // Transform Notion pages to contacts
    const contacts = allResults.map((page: any) => {
      const properties = page.properties;

      return {
        name: properties.Name?.title?.[0]?.plain_text ||
             properties.FullName?.rich_text?.[0]?.plain_text ||
             properties['Full Name']?.rich_text?.[0]?.plain_text ||
             properties.name?.rich_text?.[0]?.plain_text ||
             'Unknown',
        email: properties.Email?.email ||
              properties.email?.email ||
              properties['Email Address']?.email ||
              '',
        role: properties.Role?.select?.name ||
             properties.Position?.select?.name ||
             properties.Title?.rich_text?.[0]?.plain_text ||
             properties.role?.rich_text?.[0]?.plain_text ||
             properties.JobTitle?.rich_text?.[0]?.plain_text ||
             '',
        company: properties.Company?.select?.name ||
                properties.Organization?.select?.name ||
                properties.company?.rich_text?.[0]?.plain_text ||
                properties['Company Name']?.rich_text?.[0]?.plain_text ||
                properties.Organization?.rich_text?.[0]?.plain_text ||
                '',
        firstName: properties.FirstName?.rich_text?.[0]?.plain_text ||
                  properties['First Name']?.rich_text?.[0]?.plain_text ||
                  properties.firstName?.rich_text?.[0]?.plain_text ||
                  '',
        lastName: properties.LastName?.rich_text?.[0]?.plain_text ||
                 properties['Last Name']?.rich_text?.[0]?.plain_text ||
                 properties.lastName?.rich_text?.[0]?.plain_text ||
                 '',
        linkedinUrl: properties.LinkedIn?.url ||
                    properties['LinkedIn URL']?.url ||
                    properties.linkedin?.url ||
                    properties.LinkedIn?.rich_text?.[0]?.plain_text ||
                    '',
        website: properties.Website?.url ||
                properties.website?.url ||
                properties['Company Website']?.url ||
                properties.Website?.rich_text?.[0]?.plain_text ||
                '',
        location: properties.Location?.rich_text?.[0]?.plain_text ||
                 properties.location?.rich_text?.[0]?.plain_text ||
                 properties.Address?.rich_text?.[0]?.plain_text ||
                 properties.City?.rich_text?.[0]?.plain_text ||
                 '',
        notes: properties.Notes?.rich_text?.[0]?.plain_text ||
              properties.notes?.rich_text?.[0]?.plain_text ||
              properties.Comments?.rich_text?.[0]?.plain_text ||
              properties.Description?.rich_text?.[0]?.plain_text ||
              ''
      };
    });

    // Filter out contacts without valid emails or names, and validate URLs
    return contacts.filter((contact: any) =>
      contact.email &&
      contact.email.includes('@') &&
      contact.name &&
      contact.name !== 'Unknown' &&
      contact.name.trim() !== '' &&
      (!contact.linkedinUrl || isValidUrl(contact.linkedinUrl)) &&
      (!contact.website || isValidUrl(contact.website))
    );

  } catch (error: any) {
    logger.error('Notion API error during sync', error, {
      databaseId: sanitizeInput(databaseId)
    });

    if (error.code === 'unauthorized') {
      throw new ValidationError('Invalid Notion API key or insufficient permissions');
    }
    if (error.code === 'not_found') {
      throw new ValidationError('Notion database not found or access denied');
    }
    if (error.code === 'validation_error') {
      throw new ValidationError('Invalid Notion database configuration');
    }

    throw new Error(`Notion API error: ${error.message}`);
  }
}

async function exportToNotion(contacts: any[], config: any) {
  const { apiKey, databaseId } = config;

  if (!apiKey || !databaseId) {
    throw new ValidationError('Notion API key and database ID are required');
  }

  const notion = new NotionClient({ auth: apiKey });

  try {
    // Create pages in Notion database with batching and concurrency control
    const results = {
      successful: 0,
      failed: 0,
      errors: [] as string[]
    };

    // Process contacts in batches of 10 with concurrency limit
    const batchSize = 10;
    const concurrencyLimit = 3;

    for (let i = 0; i < contacts.length; i += batchSize) {
      const batch = contacts.slice(i, i + batchSize);
      const batchPromises = batch.map(async (contact) => {
        try {
          // Validate URLs before creating page
          const validatedContact = {
            ...contact,
            linkedinUrl: contact.linkedinUrl && isValidUrl(contact.linkedinUrl) ? contact.linkedinUrl : undefined,
            website: contact.website && isValidUrl(contact.website) ? contact.website : undefined,
          };

          await notion.pages.create({
            parent: { database_id: databaseId },
            properties: {
              Name: {
                title: [
                  {
                    text: {
                      content: validatedContact.name || `${validatedContact.firstName || ''} ${validatedContact.lastName || ''}`.trim() || 'Unknown'
                    }
                  }
                ]
              },
              Email: {
                email: validatedContact.email
              },
              ...(validatedContact.role && {
                Role: {
                  select: { name: validatedContact.role }
                }
              }),
              ...(validatedContact.company && {
                Company: {
                  select: { name: validatedContact.company }
                }
              }),
              ...(validatedContact.phone && {
                Phone: {
                  phone_number: validatedContact.phone
                }
              }),
              ...(validatedContact.linkedinUrl && {
                LinkedIn: {
                  url: validatedContact.linkedinUrl
                }
              }),
              ...(validatedContact.website && {
                Website: {
                  url: validatedContact.website
                }
              }),
              ...(validatedContact.location && {
                Location: {
                  rich_text: [
                    {
                      text: { content: validatedContact.location }
                    }
                  ]
                }
              }),
              ...(validatedContact.notes && {
                Notes: {
                  rich_text: [
                    {
                      text: { content: validatedContact.notes }
                    }
                  ]
                }
              })
            }
          });

          return { success: true };
        } catch (error: any) {
          return { success: false, email: contact.email, error: error.message };
        }
      });

      // Process batch with concurrency limit (though we're processing all at once here)
      // In a more sophisticated implementation, we'd use a library like p-limit
      const batchResults = await Promise.allSettled(batchPromises);
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          if (result.value.success) {
            results.successful++;
          } else {
            results.failed++;
            results.errors.push(`Failed to export ${result.value.email}: ${result.value.error}`);
          }
        } else {
          results.failed++;
          results.errors.push(`Batch processing error: ${result.reason}`);
        }
      }

      // Add small delay between batches to avoid rate limits
      if (i + batchSize < contacts.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return NextResponse.json({
      success: true,
      message: `Exported ${results.successful} contacts to Notion${results.failed > 0 ? `, ${results.failed} failed` : ''}`,
      results
    });

  } catch (error: any) {
    logger.error('Notion export error', error, {
      databaseId: sanitizeInput(databaseId),
      contactCount: contacts.length
    });
    throw new Error(`Notion export failed: ${error.message}`);
  }
}

async function testNotionConnection(config: any) {
  const { apiKey, databaseId } = config;

  if (!apiKey || !databaseId) {
    throw new ValidationError('Notion API key and database ID are required');
  }

  const notion = new NotionClient({ auth: apiKey });

  try {
    // Test by querying the database
    await (notion.databases as any).query({
      database_id: databaseId,
      page_size: 1
    });

    return NextResponse.json({
      success: true,
      message: 'Notion connection successful',
      metadata: {
        databaseId: sanitizeInput(databaseId)
      }
    });

  } catch (error: any) {
    logger.error('Notion connection test failed', error, {
      databaseId: sanitizeInput(databaseId)
    });

    if (error.code === 'unauthorized') {
      throw new ValidationError('Invalid Notion API key or insufficient permissions');
    }
    if (error.code === 'not_found') {
      throw new ValidationError('Notion database not found or access denied');
    }

    throw new ValidationError(`Notion connection failed: ${error.message}`);
  }
}

// Google Sheets integration functions
async function syncFromGoogleSheets(config: any) {
  const { spreadsheetId, sheetName, credentials } = config;

  if (!spreadsheetId || !credentials) {
    throw new ValidationError('Google Sheets spreadsheet ID and credentials are required');
  }

  try {
    // Initialize Google Sheets API
    const auth = new google.auth.GoogleAuth({
      credentials: credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // Get spreadsheet data
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: sheetName || 'Sheet1',
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return [];
    }

    // Assume first row is headers
    const headers = rows[0].map((header: string) => header.toLowerCase().trim());
    const dataRows = rows.slice(1);

    // Transform rows to contacts
    const contacts = dataRows.map((row: any[]) => {
      const contact: any = {};

      headers.forEach((header, index) => {
        const value = row[index] || '';

        switch (header) {
          case 'name':
          case 'full name':
          case 'fullname':
          case 'contact name':
            contact.name = value;
            break;
          case 'email':
          case 'email address':
          case 'e-mail':
            contact.email = value;
            break;
          case 'role':
          case 'position':
          case 'title':
          case 'job title':
            contact.role = value;
            break;
          case 'company':
          case 'organization':
          case 'company name':
            contact.company = value;
            break;
          case 'first name':
          case 'firstname':
            contact.firstName = value;
            break;
          case 'last name':
          case 'lastname':
            contact.lastName = value;
            break;
          case 'linkedin':
          case 'linkedin url':
          case 'linkedin profile':
            contact.linkedinUrl = value.startsWith('http') ? value : '';
            break;
          case 'website':
          case 'company website':
          case 'site':
            contact.website = value.startsWith('http') ? value : '';
            break;
          case 'location':
          case 'address':
          case 'city':
            contact.location = value;
            break;
          case 'phone':
          case 'phone number':
          case 'mobile':
            contact.phone = value;
            break;
          case 'notes':
          case 'comments':
          case 'description':
            contact.notes = value;
            break;
        }
      });

      // Set name from first/last if not provided
      if (!contact.name && (contact.firstName || contact.lastName)) {
        contact.name = `${contact.firstName || ''} ${contact.lastName || ''}`.trim();
      }

      return contact;
    });

    // Filter out contacts without valid emails
    return contacts.filter(contact =>
      contact.email &&
      contact.email.includes('@') &&
      contact.email.trim() !== ''
    );

  } catch (error: any) {
    logger.error('Google Sheets API error during sync', error, {
      spreadsheetId: sanitizeInput(spreadsheetId),
      sheetName: sanitizeInput(sheetName || 'Sheet1')
    });

    if (error.code === 403) {
      throw new ValidationError('Invalid Google Sheets credentials or insufficient permissions');
    }
    if (error.code === 404) {
      throw new ValidationError('Google Sheets spreadsheet not found or access denied');
    }

    throw new Error(`Google Sheets API error: ${error.message}`);
  }
}

async function exportToGoogleSheets(contacts: any[], config: any) {
  const { spreadsheetId, sheetName, credentials } = config;

  if (!spreadsheetId || !credentials) {
    throw new ValidationError('Google Sheets spreadsheet ID and credentials are required');
  }

  try {
    // Initialize Google Sheets API
    const auth = new google.auth.GoogleAuth({
      credentials: credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // Prepare data for export
    const headers = [
      'Name',
      'Email',
      'Role',
      'Company',
      'Phone',
      'LinkedIn URL',
      'Website',
      'Location',
      'Notes'
    ];

    const rows = contacts.map(contact => [
      contact.name || `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || '',
      contact.email || '',
      contact.role || '',
      contact.company || '',
      contact.phone || '',
      contact.linkedinUrl || '',
      contact.website || '',
      contact.location || '',
      contact.notes || ''
    ]);

    // Clear existing data and write new data
    const range = sheetName ? `${sheetName}!A:Z` : 'Sheet1!A:Z';

    // First, clear the sheet
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range,
    });

    // Then write headers and data
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: sheetName ? `${sheetName}!A1` : 'Sheet1!A1',
      valueInputOption: 'RAW',
      requestBody: {
        values: [headers, ...rows]
      }
    });

    return NextResponse.json({
      success: true,
      message: `Exported ${contacts.length} contacts to Google Sheets`,
      metadata: {
        spreadsheetId,
        sheetName: sheetName || 'Sheet1',
        exportedCount: contacts.length
      }
    });

  } catch (error: any) {
    logger.error('Google Sheets export error', error, {
      spreadsheetId: sanitizeInput(spreadsheetId),
      sheetName: sanitizeInput(sheetName || 'Sheet1'),
      contactCount: contacts.length
    });

    if (error.code === 403) {
      throw new ValidationError('Invalid Google Sheets credentials or insufficient permissions');
    }
    if (error.code === 404) {
      throw new ValidationError('Google Sheets spreadsheet not found or access denied');
    }

    throw new Error(`Google Sheets export failed: ${error.message}`);
  }
}

async function testGoogleSheetsConnection(config: any) {
  const { spreadsheetId, credentials } = config;

  if (!spreadsheetId || !credentials) {
    throw new ValidationError('Google Sheets spreadsheet ID and credentials are required');
  }

  try {
    // Initialize Google Sheets API
    const auth = new google.auth.GoogleAuth({
      credentials: credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // Test by getting spreadsheet metadata
    await sheets.spreadsheets.get({
      spreadsheetId,
    });

    return NextResponse.json({
      success: true,
      message: 'Google Sheets connection successful',
      metadata: {
        spreadsheetId: sanitizeInput(spreadsheetId)
      }
    });

  } catch (error: any) {
    logger.error('Google Sheets connection test failed', error, {
      spreadsheetId: sanitizeInput(spreadsheetId)
    });

    if (error.code === 403) {
      throw new ValidationError('Invalid Google Sheets credentials or insufficient permissions');
    }
    if (error.code === 404) {
      throw new ValidationError('Google Sheets spreadsheet not found or access denied');
    }

    throw new ValidationError(`Google Sheets connection failed: ${error.message}`);
  }
}
