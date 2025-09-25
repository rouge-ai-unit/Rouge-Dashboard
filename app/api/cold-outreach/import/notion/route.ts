/**
 * @file POST /api/cold-outreach/import/notion
 *
 * Import contacts from Notion
 *
 * ## Request Body
 * ```json
 * {
 *   "databaseId": "string",
 *   "apiKey": "string"
 * }
 * ```
 *
 * ## Response
 * ```json
 * {
 *   "message": "Imported X contacts from Notion",
 *   "contacts": [...],
 *   "metadata": {...}
 * }
 * ```
 *
 * ## Security
 * - Requires authentication
 * - Rate limited to 100 requests per minute per user
 */

import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/apiAuth";
import { coldOutreachRateLimit } from "@/lib/cold-outreach/security-utils";
import { Client } from "@notionhq/client";
import { logger, ValidationError, sanitizeInput, retryWithBackoff } from "@/lib/client-utils";
import { z } from "zod";

// Validation schemas
const notionImportSchema = z.object({
  databaseId: z.string().min(1, "Database ID is required"),
  apiKey: z.string().min(1, "API key is required"),
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

// POST /api/cold-outreach/import/notion - Import contacts from Notion
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
   const userId = session.user?.id || session.user?.email || 'unknown';    // Rate limiting
    const rateLimitCheck = coldOutreachRateLimit.check(`import-notion-${userId}`);
    if (!rateLimitCheck.allowed) {
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
      logger.error('Invalid JSON in Notion import request', error as Error, { userId });
      throw new ValidationError('Invalid JSON format');
    }

    const validatedData = notionImportSchema.parse(body);
    const { databaseId, apiKey } = validatedData;

    // Initialize Notion client
    const notion = new Client({ auth: apiKey });

    // Test connection and fetch contacts
    const contacts = await retryWithBackoff(
      async () => {
        try {
          // Query the database
          // @ts-expect-error - Notion SDK types don't fully match the API
          const response = await notion.databases.query({            database_id: databaseId,
            filter: {
              and: [
                {
                  property: 'Email',
                  email: {
                    is_not_empty: true
                  }
                }
              ]
            }
          });

          // Transform Notion pages to contacts
          const transformedContacts = response.results.map((page: any) => {
            const properties = page.properties;

            return {
              name: properties.Name?.title?.[0]?.plain_text ||
                   properties.FullName?.rich_text?.[0]?.plain_text ||
                   properties['Full Name']?.rich_text?.[0]?.plain_text ||
                   'Unknown',
              email: properties.Email?.email ||
                    properties.email?.email ||
                    properties['Email Address']?.email ||
                    '',
              role: properties.Role?.select?.name ||
                   properties.Position?.select?.name ||
                   properties.Title?.rich_text?.[0]?.plain_text ||
                   properties.role?.rich_text?.[0]?.plain_text ||
                   '',
              company: properties.Company?.select?.name ||
                      properties.Organization?.select?.name ||
                      properties.company?.rich_text?.[0]?.plain_text ||
                      properties['Company Name']?.rich_text?.[0]?.plain_text ||
                      '',
              phone: properties.Phone?.phone_number ||
                    properties.phone?.phone_number ||
                    properties['Phone Number']?.phone_number ||
                    '',
              linkedinUrl: properties.LinkedIn?.url ||
                          properties['LinkedIn URL']?.url ||
                          properties.linkedin?.url ||
                          '',
              website: properties.Website?.url ||
                      properties.website?.url ||
                      properties['Company Website']?.url ||
                      '',
              location: properties.Location?.rich_text?.[0]?.plain_text ||
                       properties.location?.rich_text?.[0]?.plain_text ||
                       properties.Address?.rich_text?.[0]?.plain_text ||
                       '',
              notes: properties.Notes?.rich_text?.[0]?.plain_text ||
                    properties.notes?.rich_text?.[0]?.plain_text ||
                    properties.Comments?.rich_text?.[0]?.plain_text ||
                    ''
            };
          });

          // Filter out contacts without valid emails
          return transformedContacts.filter((contact: any) =>
            contact.email &&
            contact.email.includes('@') &&
            contact.name &&
            contact.name !== 'Unknown'
          );

        } catch (notionError: any) {
          logger.error('Notion API error', notionError, {
            userId: sanitizeInput(userId),
            databaseId: sanitizeInput(databaseId)
          });

          if (notionError.code === 'unauthorized') {
            throw new ValidationError('Invalid Notion API key');
          }
          if (notionError.code === 'not_found') {
            throw new ValidationError('Notion database not found or access denied');
          }
          if (notionError.code === 'validation_error') {
            throw new ValidationError('Invalid database configuration');
          }

          throw new Error(`Notion API error: ${notionError.message}`);
        }
      },
      3,
      1000
    );

    // Validate contacts
    const validatedContacts = contacts.map((contact: any) => {
      const validation = contactSchema.safeParse(contact);
      if (!validation.success) {
        logger.warn('Invalid contact data from Notion', {
          userId: sanitizeInput(userId),
          errors: validation.error.errors,
          contact: sanitizeInput(JSON.stringify(contact))
        });
        // Skip invalid contacts instead of failing the entire import
        return null;
      }
      return validation.data;
    }).filter(Boolean) as typeof contacts;

    logger.info('Notion import completed successfully', {
      userId: sanitizeInput(userId),
      totalContacts: contacts.length,
      validContacts: validatedContacts.length,
      databaseId: sanitizeInput(databaseId)
    });

    return NextResponse.json({
      message: `Imported ${validatedContacts.length} contacts from Notion`,
      contacts: validatedContacts,
      metadata: {
        totalFound: contacts.length,
        validContacts: validatedContacts.length,
        skippedContacts: contacts.length - validatedContacts.length,
        source: 'notion',
        databaseId: sanitizeInput(databaseId)
      }
    });
  } catch (error) {
    const session = await requireSession();
    const userId = session?.user?.id || 'unknown';

    if (error instanceof ValidationError) {
      logger.warn('Validation error in Notion import', {
        userId: sanitizeInput(userId),
        error: error.message
      });
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    logger.error('Unexpected error in Notion import', error instanceof Error ? error : undefined, {
      userId: sanitizeInput(userId),
      stack: error instanceof Error ? error.stack : undefined
    });

    return NextResponse.json(
      { error: "Failed to import from Notion" },
      { status: 500 }
    );
  }
}
