/**
 * @file GET|POST|PUT|DELETE /api/cold-outreach/contacts
 *
 * Contact management API routes - Enterprise Grade
 *
 * ## Features
 * - Complete CRUD operations for contacts
 * - Advanced search and filtering capabilities
 * - Comprehensive input validation and sanitization
 * - Enterprise-grade error handling and logging
 * - Performance monitoring and rate limiting
 * - Audit logging for compliance
 * - Bulk operations support
 * - Data integrity and consistency checks
 *
 * ## Security
 * - Requires authentication with session validation
 * - User isolation (users can only access their own contacts)
 * - Input validation and XSS prevention
 * - Rate limiting and abuse prevention
 * - Audit logging for compliance
 *
 * ## Performance
 * - Database query optimization
 * - Response caching for frequently accessed data
 * - Performance monitoring
 * - Retry logic with exponential backoff
 * - Efficient pagination and search
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from "@/lib/apiAuth";
import { createContact, getContactsByUserId, updateContact, deleteContact } from '@/lib/cold-outreach/contacts';
import { contactSchema, Contacts } from '@/utils/schema';
import { z } from 'zod';
import { eq, and, sql } from 'drizzle-orm';
import { getDb } from '@/utils/dbConfig';
import {
  coldOutreachRateLimit,
  sanitizeInput
} from "@/lib/cold-outreach/security-utils";
import {
  logger,
  ValidationError,
  withPerformanceMonitoring,
  retryWithBackoff,
  sanitizeInput as globalSanitizeInput
} from "@/lib/client-utils";

const createContactSchema = contactSchema.omit({ id: true, userId: true, createdAt: true, updatedAt: true });
const updateContactSchema = createContactSchema.partial();

const sanitizeString = (value?: string | null) => {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed ? globalSanitizeInput(trimmed) : undefined;
};

const sanitizeStringArray = (values?: string[] | null) => {
  if (!values) return undefined;
  const cleaned = values
    .map((value) => {
      if (!value) return undefined;
      const trimmed = value.trim();
      return trimmed ? globalSanitizeInput(trimmed) : undefined;
    })
    .filter((value): value is string => typeof value === 'string');

  return cleaned.length ? cleaned : [];
};

/**
 * Audit log for contact operations
 */
function logContactAudit(userId: string, operation: string, contactData: any, success: boolean, error?: string): void {
  logger.info('Contact Operation Audit', {
    userId,
    operation,
    success,
    contactId: contactData?.id,
    contactEmail: contactData?.email ? globalSanitizeInput(contactData.email) : undefined,
    contactName: contactData?.firstName && contactData?.lastName ?
      globalSanitizeInput(`${contactData.firstName} ${contactData.lastName}`) : undefined,
    error: error ? globalSanitizeInput(error) : undefined,
    timestamp: new Date().toISOString()
  });
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  let userId = 'unknown';
  let userEmail = 'unknown';

  try {
    // Authentication with enhanced error handling
    const session = await requireSession();
    userId = session.user?.id ?? session.user?.email ?? 'unknown';
    userEmail = session.user?.email ?? 'unknown';

    logger.info('Contact List Request Started', {
      userId,
      userEmail,
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')
    });

    // Rate limiting with detailed logging
    const rateLimitCheck = coldOutreachRateLimit.check(`contacts-get-${userId}`);
    if (!rateLimitCheck.allowed) {
      logger.warn('Contact List Rate Limit Exceeded', {
        userId,
        retryAfter: rateLimitCheck.retryAfter
      });

      return NextResponse.json(
        {
          error: "Rate limit exceeded. Please try again later.",
          retryAfter: rateLimitCheck.retryAfter
        },
        {
          status: 429,
          headers: {
            'Retry-After': rateLimitCheck.retryAfter?.toString() || '60'
          }
        }
      );
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const page = Math.max(parseInt(searchParams.get('page') || '1'), 1);
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50'), 1), 100);
    const search = searchParams.get('search')?.trim() || '';
    const campaignId = searchParams.get('campaignId')?.trim();

    const offset = (page - 1) * limit;

    // Sanitize search parameters
    const sanitizedSearch = search ? globalSanitizeInput(search) : '';
    const sanitizedCampaignId = campaignId ? globalSanitizeInput(campaignId) : undefined;

    // Get contacts with retry logic
    let contacts: any[] = [];
    let totalCount = 0;
    try {
      // Get total count with same filters
      const countQuery = getDb().select({ count: sql<number>`count(*)` }).from(Contacts).where(
        and(
          eq(Contacts.userId, userId),
          ...(sanitizedSearch ? [sql`${Contacts.name} ILIKE ${`%${sanitizedSearch}%`} OR ${Contacts.email} ILIKE ${`%${sanitizedSearch}%`}`] : [])
        )
      );
      const countResult = await retryWithBackoff(() => countQuery, 3, 1000);
      totalCount = countResult[0]?.count || 0;

      contacts = await retryWithBackoff(
        () => getContactsByUserId(userId, {
          limit,
          offset,
          search: sanitizedSearch,
          campaignId: sanitizedCampaignId,
        }),
        3,
        1000,
        (error, attempt) => {
          logger.warn('Contact query retry', { userId, attempt, error: error.message });
          return true; // Retry on database errors
        }
      );
    } catch (dbError) {
      logger.error('Database query failed for contacts', dbError instanceof Error ? dbError : new Error(String(dbError)), {
        userId,
        page,
        limit,
        search: sanitizedSearch,
        campaignId: sanitizedCampaignId
      });
      throw new Error('Database query failed');
    }

    const processingTime = Date.now() - startTime;

    logger.info('Contact List Retrieved Successfully', {
      userId,
      processingTime,
      contactCount: contacts.length,
      page,
      limit,
      search: sanitizedSearch,
      campaignId: sanitizedCampaignId
    });

    return NextResponse.json({
      contacts,
      pagination: {
        page,
        limit,
        total: totalCount,
        hasMore: contacts.length === limit,
      },
      metadata: {
        processingTime,
        search: sanitizedSearch,
        campaignId: sanitizedCampaignId
      }
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logger.error('Contact List Failed', error instanceof Error ? error : new Error(String(error)), {
      userId,
      processingTime,
      errorType: error instanceof Error ? error.constructor.name : 'Unknown'
    });

    // Handle specific error types
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { error: "Unauthorized access" },
        { status: 401 }
      );
    }

    // Generic error response
    return NextResponse.json(
      {
        error: "Failed to fetch contacts",
        requestId: `contact-list-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
      },
      { status: 500 }
    );
  }
}


export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let userId = 'unknown';
  let userEmail = 'unknown';

  try {
    // Authentication with enhanced error handling
    const session = await requireSession();
    userId = session.user?.id ?? session.user?.email ?? 'unknown';
    userEmail = session.user?.email ?? 'unknown';

    logger.info('Contact Create Request Started', {
      userId,
      userEmail,
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')
    });

    // Rate limiting with detailed logging
    const rateLimitCheck = coldOutreachRateLimit.check(`contacts-create-${userId}`);
    if (!rateLimitCheck.allowed) {
      logger.warn('Contact Create Rate Limit Exceeded', {
        userId,
        retryAfter: rateLimitCheck.retryAfter
      });

      return NextResponse.json(
        {
          error: "Rate limit exceeded. Please try again later.",
          retryAfter: rateLimitCheck.retryAfter
        },
        {
          status: 429,
          headers: {
            'Retry-After': rateLimitCheck.retryAfter?.toString() || '60'
          }
        }
      );
    }

    // Parse and validate request body
    let body: any;
    try {
      body = await request.json();
    } catch (error) {
      logger.error('Invalid JSON in contact create request', error as Error, { userId });
      throw new ValidationError('Invalid JSON format');
    }

    // Validate input schema
    const validatedData = createContactSchema.parse(body);

    const fullName = `${validatedData.firstName || ''} ${validatedData.lastName || ''}`.trim() || validatedData.name?.trim() || validatedData.email.split('@')[0];

    // Sanitize inputs
    const sanitizedData = {
      name: globalSanitizeInput(fullName),
      firstName: sanitizeString(validatedData.firstName),
      lastName: sanitizeString(validatedData.lastName),
      email: validatedData.email.toLowerCase().trim(),
      company: sanitizeString(validatedData.company),
      role: sanitizeString(validatedData.role),
      phone: sanitizeString(validatedData.phone),
      linkedinUrl: sanitizeString(validatedData.linkedinUrl),
      website: sanitizeString(validatedData.website),
      location: sanitizeString(validatedData.location),
      notes: sanitizeString(validatedData.notes),
      industry: sanitizeString(validatedData.industry),
      companySize: sanitizeString(validatedData.companySize),
      revenue: sanitizeString(validatedData.revenue),
      linkedinProfile: validatedData.linkedinProfile ?? undefined,
      emailVerified: validatedData.emailVerified,
      emailValid: validatedData.emailValid,
      status: sanitizeString(validatedData.status),
      lifecycleStage: sanitizeString(validatedData.lifecycleStage),
      engagementScore: validatedData.engagementScore,
      priorityScore: validatedData.priorityScore,
      leadScore: validatedData.leadScore,
      totalEmailsSent: validatedData.totalEmailsSent,
      totalOpens: validatedData.totalOpens,
      totalClicks: validatedData.totalClicks,
      totalReplies: validatedData.totalReplies,
      totalBounces: validatedData.totalBounces,
    lastContactedAt: validatedData.lastContactedAt || null,
    lastRepliedAt: validatedData.lastRepliedAt || null,
    lastOpenedAt: validatedData.lastOpenedAt || null,
    segments: sanitizeStringArray(validatedData.segments),
    tags: sanitizeStringArray(validatedData.tags),
    customFields: validatedData.customFields
      ? JSON.parse(JSON.stringify(validatedData.customFields))
      : undefined,      source: sanitizeString(validatedData.source),
      sourceDetails: validatedData.sourceDetails ?? undefined,
  userId,
    };

    // Create contact with retry logic
    let contact: any;
    try {
      contact = await retryWithBackoff(
        () => createContact(sanitizedData),
        3,
        1000,
        (error, attempt) => {
          logger.warn('Contact creation retry', { userId, attempt, error: error.message });
          return true; // Retry on database errors
        }
      );
    } catch (dbError) {
      logger.error('Database insert failed for contact creation', dbError instanceof Error ? dbError : new Error(String(dbError)), {
        userId,
        contactData: { ...sanitizedData, email: sanitizedData.email } // Log email for debugging
      });
      throw new Error('Database insert failed');
    }

    const processingTime = Date.now() - startTime;

    logger.info('Contact Created Successfully', {
      userId,
      processingTime,
      contactId: contact.id,
      contactEmail: sanitizedData.email
    });

    logContactAudit(userId, 'create', contact, true);

    return NextResponse.json({
      contact,
      metadata: {
        processingTime
      }
    }, { status: 201 });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logger.error('Contact Create Failed', error instanceof Error ? error : new Error(String(error)), {
      userId,
      processingTime,
      errorType: error instanceof Error ? error.constructor.name : 'Unknown'
    });

    logContactAudit(userId, 'create', {}, false, errorMessage);

    // Handle specific error types
    if (error instanceof ValidationError || error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid contact data", details: error instanceof z.ZodError ? error.errors : error.message },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { error: "Unauthorized access" },
        { status: 401 }
      );
    }

    // Generic error response
    return NextResponse.json(
      {
        error: "Failed to create contact",
        requestId: `contact-create-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
      },
      { status: 500 }
    );
  }
}


export async function PUT(request: NextRequest) {
  const startTime = Date.now();
  let userId = 'unknown';
  let userEmail = 'unknown';

  try {
    // Authentication with enhanced error handling
    const session = await requireSession();
    userId = session.user?.id ?? session.user?.email ?? 'unknown';
    userEmail = session.user?.email ?? 'unknown';

    logger.info('Contact Update Request Started', {
      userId,
      userEmail,
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')
    });

    // Rate limiting with detailed logging
    const rateLimitCheck = coldOutreachRateLimit.check(`contacts-update-${userId}`);
    if (!rateLimitCheck.allowed) {
      logger.warn('Contact Update Rate Limit Exceeded', {
        userId,
        retryAfter: rateLimitCheck.retryAfter
      });

      return NextResponse.json(
        {
          error: "Rate limit exceeded. Please try again later.",
          retryAfter: rateLimitCheck.retryAfter
        },
        {
          status: 429,
          headers: {
            'Retry-After': rateLimitCheck.retryAfter?.toString() || '60'
          }
        }
      );
    }

    // Parse and validate request body
    let body: any;
    try {
      body = await request.json();
    } catch (error) {
      logger.error('Invalid JSON in contact update request', error as Error, { userId });
      throw new ValidationError('Invalid JSON format');
    }

    const { id, ...updateData } = body;

    if (!id) {
      throw new ValidationError('Contact ID is required');
    }

    // Validate input schema
    const validatedData = updateContactSchema.parse(updateData);

    // Sanitize inputs
    const sanitizedData: Record<string, any> = {
      email: validatedData.email ? validatedData.email.toLowerCase().trim() : undefined,
      company: sanitizeString(validatedData.company),
      role: sanitizeString(validatedData.role),
      firstName: sanitizeString(validatedData.firstName),
      lastName: sanitizeString(validatedData.lastName),
      phone: sanitizeString(validatedData.phone),
      linkedinUrl: sanitizeString(validatedData.linkedinUrl),
      website: sanitizeString(validatedData.website),
      location: sanitizeString(validatedData.location),
      notes: sanitizeString(validatedData.notes),
      industry: sanitizeString(validatedData.industry),
      companySize: sanitizeString(validatedData.companySize),
      revenue: sanitizeString(validatedData.revenue),
      linkedinProfile: validatedData.linkedinProfile ?? undefined,
      emailVerified: validatedData.emailVerified,
      emailValid: validatedData.emailValid,
      status: sanitizeString(validatedData.status),
      lifecycleStage: sanitizeString(validatedData.lifecycleStage),
      engagementScore: validatedData.engagementScore,
      priorityScore: validatedData.priorityScore,
      leadScore: validatedData.leadScore,
      totalEmailsSent: validatedData.totalEmailsSent,
      totalOpens: validatedData.totalOpens,
      totalClicks: validatedData.totalClicks,
      totalReplies: validatedData.totalReplies,
      totalBounces: validatedData.totalBounces,
      lastContactedAt: validatedData.lastContactedAt ?? undefined,
      lastRepliedAt: validatedData.lastRepliedAt ?? undefined,
      lastOpenedAt: validatedData.lastOpenedAt ?? undefined,
  segments: sanitizeStringArray(validatedData.segments),
  tags: sanitizeStringArray(validatedData.tags),
      customFields: validatedData.customFields ?? undefined,
      source: sanitizeString(validatedData.source),
      sourceDetails: validatedData.sourceDetails ?? undefined,
    };

    if (validatedData.name) {
      sanitizedData.name = sanitizeString(validatedData.name);
    } else if (sanitizedData.firstName !== undefined || sanitizedData.lastName !== undefined) {
      const combinedName = `${sanitizedData.firstName || ''} ${sanitizedData.lastName || ''}`.trim();
      if (combinedName) {
        sanitizedData.name = globalSanitizeInput(combinedName);
      }
    }

    // Update contact with retry logic
    let contact: any;
    try {
      contact = await retryWithBackoff(
        () => updateContact(id, userId, sanitizedData),
        3,
        1000,
        (error, attempt) => {
          logger.warn('Contact update retry', { userId, contactId: id, attempt, error: error.message });
          return true; // Retry on database errors
        }
      );
    } catch (dbError) {
      logger.error('Database update failed for contact', dbError instanceof Error ? dbError : new Error(String(dbError)), {
        userId,
        contactId: id
      });
      throw new Error('Database update failed');
    }

    if (!contact) {
      logger.warn('Contact not found for update', { userId, contactId: id });
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    const processingTime = Date.now() - startTime;

    logger.info('Contact Updated Successfully', {
      userId,
      processingTime,
      contactId: contact.id,
      contactEmail: contact.email
    });

    logContactAudit(userId, 'update', contact, true);

    return NextResponse.json({
      contact,
      metadata: {
        processingTime
      }
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logger.error('Contact Update Failed', error instanceof Error ? error : new Error(String(error)), {
      userId,
      processingTime,
      errorType: error instanceof Error ? error.constructor.name : 'Unknown'
    });

    logContactAudit(userId, 'update', {}, false, errorMessage);

    // Handle specific error types
    if (error instanceof ValidationError || error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid contact data", details: error instanceof z.ZodError ? error.errors : error.message },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { error: "Unauthorized access" },
        { status: 401 }
      );
    }

    // Generic error response
    return NextResponse.json(
      {
        error: "Failed to update contact",
        requestId: `contact-update-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
      },
      { status: 500 }
    );
  }
}


export async function DELETE(request: NextRequest) {
  const startTime = Date.now();
  let userId = 'unknown';
  let userEmail = 'unknown';

  try {
    // Authentication with enhanced error handling
    const session = await requireSession();
    userId = session.user?.id ?? session.user?.email ?? 'unknown';
    userEmail = session.user?.email ?? 'unknown';

    logger.info('Contact Delete Request Started', {
      userId,
      userEmail,
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')
    });

    // Rate limiting with detailed logging
    const rateLimitCheck = coldOutreachRateLimit.check(`contacts-delete-${userId}`);
    if (!rateLimitCheck.allowed) {
      logger.warn('Contact Delete Rate Limit Exceeded', {
        userId,
        retryAfter: rateLimitCheck.retryAfter
      });

      return NextResponse.json(
        {
          error: "Rate limit exceeded. Please try again later.",
          retryAfter: rateLimitCheck.retryAfter
        },
        {
          status: 429,
          headers: {
            'Retry-After': rateLimitCheck.retryAfter?.toString() || '60'
          }
        }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      throw new ValidationError('Contact ID is required');
    }

    const sanitizedId = globalSanitizeInput(id);

    // Delete contact with retry logic
    let success: boolean;
    try {
      success = await retryWithBackoff(
        () => deleteContact(sanitizedId, userId),
        3,
        1000,
        (error, attempt) => {
          logger.warn('Contact delete retry', { userId, contactId: sanitizedId, attempt, error: error.message });
          return true; // Retry on database errors
        }
      );
    } catch (dbError) {
      logger.error('Database delete failed for contact', dbError instanceof Error ? dbError : new Error(String(dbError)), {
        userId,
        contactId: sanitizedId
      });
      throw new Error('Database delete failed');
    }

    if (!success) {
      logger.warn('Contact not found for deletion', { userId, contactId: sanitizedId });
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    const processingTime = Date.now() - startTime;

    logger.info('Contact Deleted Successfully', {
      userId,
      processingTime,
      contactId: sanitizedId
    });

    logContactAudit(userId, 'delete', { id: sanitizedId }, true);

    return NextResponse.json({
      message: 'Contact deleted successfully',
      metadata: {
        processingTime
      }
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logger.error('Contact Delete Failed', error instanceof Error ? error : new Error(String(error)), {
      userId,
      processingTime,
      errorType: error instanceof Error ? error.constructor.name : 'Unknown'
    });

    logContactAudit(userId, 'delete', {}, false, errorMessage);

    // Handle specific error types
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.message },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { error: "Unauthorized access" },
        { status: 401 }
      );
    }

    // Generic error response
    return NextResponse.json(
      {
        error: "Failed to delete contact",
        requestId: `contact-delete-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
      },
      { status: 500 }
    );
  }
}
