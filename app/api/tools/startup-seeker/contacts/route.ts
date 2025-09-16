import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/utils/dbConfig';
import { ContactResearchJobs, AgritechStartups } from '@/utils/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { startupGenerationEngine } from '@/lib/startup_seeker/startup-seeker';
import axios from 'axios';
import { 
  createErrorResponse, 
  createSuccessResponse, 
  ValidationErrors,
  isValidUUID,
  isRateLimited 
} from '../utils/response-helpers';

// Validation schema
const contactRequestSchema = z.object({
  startupId: z.string().uuid('Invalid startup ID format'),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  includeLinkedIn: z.boolean().default(true),
  includeEmail: z.boolean().default(true),
  includePhone: z.boolean().default(false)
});

/**
 * POST /api/tools/startup-seeker/contacts
 * Research contact information for a specific startup
 * Enterprise-grade with comprehensive validation and error handling
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Authentication check
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return createErrorResponse(
        ValidationErrors.UNAUTHORIZED.message,
        ValidationErrors.UNAUTHORIZED.code,
        ValidationErrors.UNAUTHORIZED.status
      );
    }

    const userId = session.user.email;

    // Rate limiting check
    if (isRateLimited(userId, 'contact_research')) {
      return createErrorResponse(
        ValidationErrors.RATE_LIMITED.message,
        ValidationErrors.RATE_LIMITED.code,
        ValidationErrors.RATE_LIMITED.status
      );
    }

    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return createErrorResponse(
        'Invalid JSON in request body',
        'INVALID_JSON',
        400
      );
    }

    const validation = contactRequestSchema.safeParse(body);
    if (!validation.success) {
      return createErrorResponse(validation.error);
    }

    const { startupId, priority, includeLinkedIn, includeEmail, includePhone } = validation.data;

    console.log(`🔍 Contact research request for startup ${startupId} by user ${userId}`);

    const db = getDb();

    // Verify startup exists and belongs to user
    const startup = await db
      .select({
        id: AgritechStartups.id,
        name: AgritechStartups.name,
        website: AgritechStartups.website,
        description: AgritechStartups.description,
        contactInfo: AgritechStartups.contactInfo
      })
      .from(AgritechStartups)
      .where(
        and(
          eq(AgritechStartups.id, startupId),
          eq(AgritechStartups.userId, userId)
        )
      )
      .limit(1);

    if (!startup || startup.length === 0) {
      return createErrorResponse(
        'Startup not found or access denied',
        'STARTUP_NOT_FOUND',
        404
      );
    }

    const startupData = startup[0];

    // Check if contact info already exists and is recent
    const existingContactInfo = startupData.contactInfo as any;
    if (existingContactInfo?.lastUpdated) {
      const lastUpdated = new Date(existingContactInfo.lastUpdated);
      const daysSinceUpdate = (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysSinceUpdate < 7) { // Contact info is less than 7 days old
        return createSuccessResponse({
          message: 'Contact information already up to date',
          contactInfo: existingContactInfo,
          cached: true
        }, {
          processingTime: Date.now() - startTime
        });
      }
    }

    // Create contact research job record  
    const jobRecord = await db
      .insert(ContactResearchJobs)
      .values({
        userId: userId,
        startupId: startupId,
        startupName: startupData.name,
        website: startupData.website || '',
        status: 'processing'
      })
      .returning();

    const jobId = jobRecord[0].id;

    // Perform synchronous, lightweight contact discovery (no background worker)
    const findings: Record<string, any> = {
      name: startupData.name,
      website: startupData.website,
      lastUpdated: new Date().toISOString(),
      via: 'synchronous-scan',
      priority,
      options: { includeLinkedIn, includeEmail, includePhone }
    };

    try {
      // LinkedIn heuristic
      if (includeLinkedIn && startupData.name) {
        const slug = startupData.name
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, '')
          .trim()
          .replace(/\s+/g, '-');
        findings.linkedinUrl = `https://www.linkedin.com/company/${slug}`;
      }

      // Email heuristic: try info@/contact@ based on domain
      if (includeEmail && startupData.website) {
        try {
          const url = new URL(startupData.website.startsWith('http') ? startupData.website : `https://${startupData.website}`);
          const domain = url.hostname.replace(/^www\./, '');
          findings.emails = [`info@${domain}`, `contact@${domain}`];
        } catch {}
      }

      // Phone: not reliably discoverable synchronously; leave placeholder
      if (includePhone) {
        findings.phone = null;
      }
    } catch {}

    // Update startup with discovered contacts
    await startupGenerationEngine.updateStartupContacts(startupId, findings, userId);

    // Mark job completed
    await db
      .update(ContactResearchJobs)
      .set({ status: 'completed', result: findings, completedAt: new Date().toISOString() })
      .where(and(eq(ContactResearchJobs.id, jobId), eq(ContactResearchJobs.userId, userId)));

    console.log(`✅ Contact research job ${jobId} completed for startup ${startupId}`);

    return createSuccessResponse({
      jobId,
      message: 'Contact research completed',
      status: 'completed',
      contactInfo: findings,
      startup: {
        id: startupData.id,
        name: startupData.name,
        website: startupData.website
      }
    }, {
      processingTime: Date.now() - startTime
    });

  } catch (error) {
    console.error('Contact research API error:', error);
    return createErrorResponse(
      error instanceof Error ? error.message : 'Failed to initiate contact research',
      'CONTACT_RESEARCH_ERROR',
      500
    );
  }
}

/**
 * GET /api/tools/startup-seeker/contacts?startupId=xxx
 * Get contact research status and results
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Authentication check
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return createErrorResponse(
        ValidationErrors.UNAUTHORIZED.message,
        ValidationErrors.UNAUTHORIZED.code,
        ValidationErrors.UNAUTHORIZED.status
      );
    }

    const { searchParams } = new URL(request.url);
    const startupId = searchParams.get('startupId');

    if (!startupId || !isValidUUID(startupId)) {
      return createErrorResponse(
        'Valid startup ID is required',
        'INVALID_STARTUP_ID',
        400
      );
    }

    const userId = session.user.email;
    const db = getDb();

    // Get startup with contact info
    const startup = await db
      .select({
        id: AgritechStartups.id,
        name: AgritechStartups.name,
        website: AgritechStartups.website,
        contactInfo: AgritechStartups.contactInfo
      })
      .from(AgritechStartups)
      .where(
        and(
          eq(AgritechStartups.id, startupId),
          eq(AgritechStartups.userId, userId)
        )
      )
      .limit(1);

    if (!startup || startup.length === 0) {
      return createErrorResponse(
        'Startup not found or access denied',
        'STARTUP_NOT_FOUND',
        404
      );
    }

    const startupData = startup[0];
    const contactInfo = startupData.contactInfo as any || {};

    return createSuccessResponse({
      startup: {
        id: startupData.id,
        name: startupData.name,
        website: startupData.website
      },
      contactInfo,
      hasContacts: !!contactInfo.email || !!contactInfo.phone || !!contactInfo.linkedinUrl,
      lastUpdated: contactInfo.lastUpdated || null
    }, {
      processingTime: Date.now() - startTime
    });

  } catch (error) {
    console.error('Get contacts API error:', error);
    return createErrorResponse(
      error instanceof Error ? error.message : 'Failed to fetch contact information',
      'FETCH_CONTACTS_ERROR',
      500
    );
  }
}
