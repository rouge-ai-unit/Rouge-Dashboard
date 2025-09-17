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
 * Perform asynchronous contact research
 */
async function performContactResearch(
  jobId: string,
  startupData: any,
  options: { priority: string; includeLinkedIn: boolean; includeEmail: boolean; includePhone: boolean }
) {
  const db = getDb();

  try {
    // Perform comprehensive contact discovery
    const findings: Record<string, any> = {
      name: startupData.name,
      website: startupData.website,
      lastUpdated: new Date().toISOString(),
      via: 'comprehensive-scan',
      priority: options.priority,
      options: options
    };

    // LinkedIn research
    if (options.includeLinkedIn && startupData.name) {
      const slug = startupData.name
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .trim()
        .replace(/\s+/g, '-');
      findings.linkedinUrl = `https://www.linkedin.com/company/${slug}`;

      // Try to verify LinkedIn page exists
      try {
        const response = await axios.get(findings.linkedinUrl, {
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        findings.linkedinVerified = response.status === 200;
      } catch {
        findings.linkedinVerified = false;
      }
    }

    // Email discovery with enhanced scraping
    if (options.includeEmail && startupData.website) {
      try {
        const url = new URL(startupData.website.startsWith('http') ? startupData.website : `https://${startupData.website}`);
        const domain = url.hostname.replace(/^www\./, '');

        findings.emails = [
          `info@${domain}`,
          `contact@${domain}`,
          `hello@${domain}`,
          `support@${domain}`,
          `sales@${domain}`,
          `team@${domain}`
        ];

        // Enhanced website scraping for contact information
        try {
          console.log(`🔍 Scraping contact info from: ${startupData.website}`);
          
          const websiteResponse = await axios.get(startupData.website, {
            timeout: 25000, // Increased timeout
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.5',
              'Accept-Encoding': 'gzip, deflate, br',
              'Connection': 'keep-alive',
              'Upgrade-Insecure-Requests': '1',
              'Sec-Fetch-Dest': 'document',
              'Sec-Fetch-Mode': 'navigate',
              'Sec-Fetch-Site': 'none',
              'Cache-Control': 'max-age=0'
            },
            maxRedirects: 5,
            validateStatus: (status) => status < 500 // Accept 4xx but not 5xx
          });

          const html = websiteResponse.data;
          
          // Extract emails with improved regex
          const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
          const foundEmails = html.match(emailRegex);
          
          if (foundEmails && foundEmails.length > 0) {
            // Filter out common non-contact emails but keep legitimate business emails
            const filteredEmails = foundEmails.filter((email: string) => {
              const lowerEmail = email.toLowerCase();
              return !lowerEmail.includes('noreply') && 
                     !lowerEmail.includes('no-reply') && 
                     !lowerEmail.includes('donotreply') &&
                     !lowerEmail.includes('example') &&
                     !lowerEmail.includes('test') &&
                     !lowerEmail.includes('placeholder') &&
                     !lowerEmail.includes('your') &&
                     !lowerEmail.includes('email') &&
                     !lowerEmail.includes('mail') &&
                     email.length < 100 && // Reasonable email length
                     email.includes('@') && // Must have @ symbol
                     email.split('@')[1]?.includes('.'); // Must have domain
            });
            
            findings.foundEmails = [...new Set(filteredEmails)].slice(0, 10); // Limit to 10 unique emails
            console.log(`📧 Found ${findings.foundEmails.length} emails from website: ${findings.foundEmails.slice(0, 3).join(', ')}`);
          }

          // Try to find contact pages and scrape them too
          const contactPageUrls = [
            '/contact',
            '/contact-us',
            '/about',
            '/about-us',
            '/team',
            '/our-team'
          ];

          for (const contactPath of contactPageUrls.slice(0, 2)) { // Limit to 2 additional pages
            try {
              const contactUrl = `${startupData.website.replace(/\/$/, '')}${contactPath}`;
              console.log(`🔍 Checking contact page: ${contactUrl}`);
              
              const contactResponse = await axios.get(contactUrl, {
                timeout: 10000,
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                maxRedirects: 3
              });

              const contactHtml = contactResponse.data;
              const contactEmails = contactHtml.match(emailRegex);
              
              if (contactEmails && contactEmails.length > 0) {
                const filteredContactEmails = contactEmails.filter((email: string) => {
                  const lowerEmail = email.toLowerCase();
                  return !lowerEmail.includes('noreply') && 
                         !lowerEmail.includes('example') &&
                         !lowerEmail.includes('test') &&
                         email.length < 100;
                });
                
                if (filteredContactEmails.length > 0) {
                  findings.foundEmails = [
                    ...(findings.foundEmails || []),
                    ...filteredContactEmails
                  ];
                  findings.foundEmails = [...new Set(findings.foundEmails)].slice(0, 10);
                  console.log(`📧 Found additional ${filteredContactEmails.length} emails from ${contactPath}`);
                }
              }
            } catch (contactError) {
              // Continue if contact page doesn't exist
              console.log(`⚠️ Could not access ${contactPath}: ${contactError}`);
            }
          }

        } catch (websiteError) {
          console.warn(`Could not scan website for emails: ${websiteError}`);
          // Continue with basic contact info even if scraping fails
        }
      } catch (urlError) {
        console.warn(`Invalid website URL: ${startupData.website}`);
        // Continue with basic contact info
      }
    }

    // Ensure we always have some contact information
    if (!findings.foundEmails || findings.foundEmails.length === 0) {
      // If no emails found from website, at least keep the generic ones
      findings.foundEmails = findings.emails || [];
      console.log(`📧 Using generic emails as fallback: ${findings.foundEmails.join(', ')}`);
    }

    // Phone number research
    if (options.includePhone) {
      findings.phone = null; // Initialize
      
      try {
        // Try to extract phone numbers from website
        const websiteResponse = await axios.get(startupData.website, {
          timeout: 15000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });

        const html = websiteResponse.data;
        
        // Phone number regex patterns
        const phoneRegexes = [
          /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,  // US format: 123-456-7890
          /\b\d{10,11}\b/g,  // 10-11 digits
          /\+\d{1,3}[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,4}\b/g,  // International format
          /\(\d{3}\)\s*\d{3}[-.]?\d{4}\b/g,  // (123) 456-7890
          /\d{3}\s\d{3}\s\d{4}\b/g  // 123 456 7890
        ];

        const foundPhones: string[] = [];
        
        for (const regex of phoneRegexes) {
          const matches = html.match(regex);
          if (matches) {
            foundPhones.push(...matches);
          }
        }

        if (foundPhones.length > 0) {
          // Clean and deduplicate phone numbers
          const cleanedPhones = foundPhones
            .map(phone => phone.replace(/[^\d+\-\(\)\.\s]/g, '').trim())
            .filter(phone => phone.length >= 10 && phone.length <= 20)
            .filter((phone, index, arr) => arr.indexOf(phone) === index) // Remove duplicates
            .slice(0, 3); // Limit to 3 numbers
            
          if (cleanedPhones.length > 0) {
            findings.foundPhones = cleanedPhones;
            console.log(`📞 Found ${cleanedPhones.length} phone numbers from website`);
          }
        }
      } catch (phoneError) {
        console.warn(`Could not scan website for phone numbers: ${phoneError}`);
      }
      
      findings.phoneNote = 'Phone numbers extracted from website contact information';
    }

    // Additional contact research
    findings.contactMethods = {
      website: startupData.website,
      linkedin: findings.linkedinUrl,
      emails: findings.emails || [],
      foundEmails: findings.foundEmails || [],
      foundPhones: findings.foundPhones || [],
      priority: options.priority,
      researchDate: new Date().toISOString(),
      linkedinVerified: findings.linkedinVerified,
      totalContactsFound: (findings.foundEmails?.length || 0) + (findings.foundPhones?.length || 0)
    };

    // Update startup with discovered contacts
    await startupGenerationEngine.updateStartupContacts(startupData.id, findings, startupData.userId);

    // Mark job completed
    await db
      .update(ContactResearchJobs)
      .set({
        status: 'completed',
        result: findings,
        completedAt: new Date().toISOString()
      })
      .where(eq(ContactResearchJobs.id, jobId));

    console.log(`✅ Contact research job ${jobId} completed for startup ${startupData.id}`);

  } catch (error) {
    console.error(`❌ Contact research job ${jobId} failed:`, error);

    // Mark job as failed
    await db
      .update(ContactResearchJobs)
      .set({
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        completedAt: new Date().toISOString()
      })
      .where(eq(ContactResearchJobs.id, jobId));
  }
}

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

    // Start asynchronous contact research
    performContactResearch(jobId, startupData, {
      priority,
      includeLinkedIn,
      includeEmail,
      includePhone
    });

    console.log(`🚀 Started contact research job ${jobId} for startup ${startupId}`);

    return createSuccessResponse({
      jobId,
      message: 'Contact research started',
      status: 'processing',
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

    // Flatten contact information for easier frontend consumption
    const flattenedContacts = {
      linkedinUrl: contactInfo.linkedinUrl || null,
      linkedinVerified: contactInfo.linkedinVerified || false,
      emails: contactInfo.foundEmails || contactInfo.emails || [],
      phones: contactInfo.foundPhones || [],
      website: startupData.website,
      lastUpdated: contactInfo.lastUpdated || null,
      researchDate: contactInfo.researchDate || null,
      totalContactsFound: contactInfo.contactMethods?.totalContactsFound || 
                         ((contactInfo.foundEmails?.length || 0) + (contactInfo.foundPhones?.length || 0)),
      priority: contactInfo.priority || 'medium',
      // Include raw data for debugging
      raw: contactInfo
    };

    return createSuccessResponse({
      startup: {
        id: startupData.id,
        name: startupData.name,
        website: startupData.website
      },
      contactInfo: flattenedContacts,
      hasContacts: !!(flattenedContacts.emails?.length || flattenedContacts.phones?.length || flattenedContacts.linkedinUrl),
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
