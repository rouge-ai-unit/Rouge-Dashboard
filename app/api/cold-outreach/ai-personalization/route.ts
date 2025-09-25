import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { coldOutreachRateLimit } from '@/lib/rate-limit';
import { getDb } from '@/utils/dbConfig';
import { Contacts, Templates, Messages } from '@/utils/schema';
import { eq, and } from 'drizzle-orm';
import { desc } from 'drizzle-orm/sql';
import { generatePersonalizedMessage, generateFollowUpSequence, optimizeSubjectLine, analyzeContactIntent } from '@/lib/cold-outreach/ai-personalization';
import { z } from 'zod';
import { logger, withPerformanceMonitoring, ValidationError, retryWithBackoff, sanitizeInput } from '@/lib/client-utils';

/**
 * Zod validation schemas for AI personalization operations
 */
const aiPersonalizationSchema = z.object({
  action: z.enum([
    'generate_personalized_message',
    'generate_follow_up_sequence',
    'optimize_subject_line',
    'analyze_contact_intent'
  ]),
  contactId: z.string().optional(),
  templateId: z.string().optional(),
  messageId: z.string().optional(),
  context: z.record(z.any()).optional(),
});

/**
 * Audit logging functions for AI personalization operations
 */
function auditAIPersonalizationOperation(
  operation: string,
  userId: string,
  metadata?: Record<string, any>
) {
  logger.info(`AI Personalization ${operation}`, {
    userId,
    operation,
    resource: 'ai-personalization',
    ...metadata,
    timestamp: new Date().toISOString(),
    source: 'api:cold-outreach:ai-personalization'
  });
}

/**
 * POST /api/cold-outreach/ai-personalization
 * Handles various AI-powered personalization operations for cold outreach
 * @param request - Next.js request object containing action and parameters
 * @returns Promise<NextResponse> - JSON response with AI-generated content
 */
export const POST = withPerformanceMonitoring(
  async (request: NextRequest): Promise<NextResponse> => {
    const startTime = Date.now();
    let userId: string | null = null;

    try {
      // Authentication
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        logger.warn('Unauthorized access attempt to AI personalization API', {
          ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
          timestamp: new Date().toISOString(),
        });
        return NextResponse.json(
          { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
          { status: 401 }
        );
      }

      userId = session.user.id;

  // Rate limiting with detailed logging
  const rateLimitResult = coldOutreachRateLimit.check(`${session.user.id}:ai-personalization`);
      if (!rateLimitResult.allowed) {
        logger.warn('Rate limit exceeded for AI personalization', {
          userId: session.user.id,
          limit: 30,
          resetTime: rateLimitResult.resetTime,
          timestamp: new Date().toISOString(),
        });
        return NextResponse.json(
          {
            error: 'Rate limit exceeded. Please try again later.',
            code: 'RATE_LIMIT_EXCEEDED',
            retryAfter: rateLimitResult.retryAfter,
          },
          { status: 429 }
        );
      }

      // Parse and validate request body
      let body: any;
      try {
        body = await request.json();
      } catch (parseError) {
        logger.warn('Invalid JSON in AI personalization request', {
          userId,
          error: parseError instanceof Error ? parseError.message : 'Invalid JSON',
          timestamp: new Date().toISOString(),
        });
        return NextResponse.json(
          { error: 'Invalid JSON payload', code: 'INVALID_JSON' },
          { status: 400 }
        );
      }

      // Validate input with Zod schema
      const validatedData = aiPersonalizationSchema.parse(body);
      const { action, contactId, templateId, messageId, context } = validatedData;

      logger.info('Processing AI personalization request', {
        userId,
        action,
        contactId: contactId ? '[REDACTED]' : undefined,
        templateId,
        messageId,
        hasContext: !!context,
        timestamp: new Date().toISOString(),
      });

      const db = getDb();

      // Route to appropriate handler based on action
      let result: NextResponse;

      switch (action) {
        case 'generate_personalized_message':
          if (!contactId || !templateId) {
            return NextResponse.json(
              { error: 'contactId and templateId are required for generate_personalized_message', code: 'MISSING_PARAMETERS' },
              { status: 400 }
            );
          }
          result = await generatePersonalizedMessageAPI(db, userId, contactId, templateId, context);
          break;

        case 'generate_follow_up_sequence':
          if (!messageId) {
            return NextResponse.json(
              { error: 'messageId is required for generate_follow_up_sequence', code: 'MISSING_PARAMETERS' },
              { status: 400 }
            );
          }
          result = await generateFollowUpSequenceAPI(db, userId, messageId, context);
          break;

        case 'optimize_subject_line':
          if (!contactId) {
            return NextResponse.json(
              { error: 'contactId is required for optimize_subject_line', code: 'MISSING_PARAMETERS' },
              { status: 400 }
            );
          }
          result = await optimizeSubjectLineAPI(db, userId, contactId, context);
          break;

        case 'analyze_contact_intent':
          if (!contactId) {
            return NextResponse.json(
              { error: 'contactId is required for analyze_contact_intent', code: 'MISSING_PARAMETERS' },
              { status: 400 }
            );
          }
          result = await analyzeContactIntentAPI(db, userId, contactId);
          break;

        default:
          return NextResponse.json(
            { error: 'Invalid action', code: 'INVALID_ACTION' },
            { status: 400 }
          );
      }

      const responseTime = Date.now() - startTime;

      logger.info('AI personalization request completed', {
        userId,
        action,
        responseTime,
        timestamp: new Date().toISOString(),
      });

      // Audit log the AI operation
      await auditAIPersonalizationOperation(action, userId, {
        action,
        contactId: contactId ? '[REDACTED]' : undefined,
        templateId,
        messageId,
        hasContext: !!context,
        responseTime,
      });

      return result;

    } catch (error) {
      const responseTime = Date.now() - startTime;

      logger.error('AI personalization API error', error instanceof Error ? error : new Error('Unknown error'), {
        userId,
        responseTime,
        timestamp: new Date().toISOString(),
      });

      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            error: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: error.errors.map(err => ({
              field: err.path.join('.'),
              message: err.message,
              code: err.code,
            })),
          },
          { status: 400 }
        );
      }

      if (error instanceof ValidationError) {
        return NextResponse.json(
          {
            error: error.message,
            code: 'VALIDATION_ERROR',
            details: (error as any).details || {},
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          error: 'Internal server error',
          code: 'INTERNAL_ERROR',
          metadata: {
            responseTime,
            timestamp: new Date().toISOString(),
          },
        },
        { status: 500 }
      );
    }
  },
  'ai-personalization.post'
);

async function generatePersonalizedMessageAPI(
  db: any,
  userId: string,
  contactId: string,
  templateId: string,
  context?: any
): Promise<NextResponse> {
  try {
    // Validate and sanitize IDs
    const sanitizedContactId = sanitizeInput(contactId);
    const sanitizedTemplateId = sanitizeInput(templateId);

    if (!sanitizedContactId || !sanitizedTemplateId) {
      return NextResponse.json(
        { error: 'Invalid contact or template ID', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    logger.info('Generating personalized message', {
      userId,
      contactId: '[REDACTED]',
      templateId: '[REDACTED]',
      hasContext: !!context,
      timestamp: new Date().toISOString(),
    });

    // Get contact information with retry
    const contact: any[] = await retryWithBackoff(
      () => db.select().from(Contacts).where(
        and(eq(Contacts.id, sanitizedContactId), eq(Contacts.userId, userId))
      ).limit(1),
      3,
      1000
    );

    if (!contact || contact.length === 0) {
      logger.warn('Contact not found for personalization', {
        userId,
        contactId: '[REDACTED]',
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json(
        { error: 'Contact not found', code: 'CONTACT_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Get template with retry
    const template: any[] = await retryWithBackoff(
      () => db.select().from(Templates).where(
        and(eq(Templates.id, sanitizedTemplateId), eq(Templates.userId, userId))
      ).limit(1),
      3,
      1000
    );

    if (!template || template.length === 0) {
      logger.warn('Template not found for personalization', {
        userId,
        templateId: '[REDACTED]',
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json(
        { error: 'Template not found', code: 'TEMPLATE_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Generate personalized message with retry
    const personalizedMessage = await retryWithBackoff(
      () => generatePersonalizedMessage(contact[0], template[0], context),
      3,
      2000
    );

    logger.info('Personalized message generated successfully', {
      userId,
      messageLength: personalizedMessage?.length || 0,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: personalizedMessage,
      metadata: {
        contactId: '[REDACTED]',
        templateId: '[REDACTED]',
        timestamp: new Date().toISOString(),
        apiVersion: 'v1',
      },
    });

  } catch (error) {
    logger.error('Error generating personalized message', error instanceof Error ? error : new Error('Unknown error'), {
      userId,
      contactId: '[REDACTED]',
      templateId: '[REDACTED]',
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        error: 'Failed to generate personalized message',
        code: 'GENERATION_FAILED',
        metadata: {
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }
}

async function generateFollowUpSequenceAPI(
  db: any,
  userId: string,
  messageId: string,
  context?: any
): Promise<NextResponse> {
  try {
    // Validate and sanitize message ID
    const sanitizedMessageId = sanitizeInput(messageId);

    if (!sanitizedMessageId) {
      return NextResponse.json(
        { error: 'Invalid message ID', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    logger.info('Generating follow-up sequence', {
      userId,
      messageId: '[REDACTED]',
      hasContext: !!context,
      timestamp: new Date().toISOString(),
    });

    // Get original message and contact info with retry
    const messageData: any[] = await retryWithBackoff(
      () => db.select({
        message: Messages,
        contact: Contacts
      })
      .from(Messages)
      .innerJoin(Contacts, eq(Messages.contactId, Contacts.id))
      .where(
        and(
          eq(Messages.id, sanitizedMessageId),
          eq(Messages.userId, userId)
        )
      )
      .limit(1),
      3,
      1000
    );

    if (!messageData || messageData.length === 0) {
      logger.warn('Message not found for follow-up sequence', {
        userId,
        messageId: '[REDACTED]',
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json(
        { error: 'Message not found', code: 'MESSAGE_NOT_FOUND' },
        { status: 404 }
      );
    }

    const { message, contact } = messageData[0];

    // Generate follow-up sequence with retry
    const followUpSequence = await retryWithBackoff(
      () => generateFollowUpSequence(message, contact, context),
      3,
      2000
    );

    logger.info('Follow-up sequence generated successfully', {
      userId,
      sequenceLength: Array.isArray(followUpSequence) ? followUpSequence.length : 0,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      sequence: followUpSequence,
      metadata: {
        messageId: '[REDACTED]',
        contactId: '[REDACTED]',
        timestamp: new Date().toISOString(),
        apiVersion: 'v1',
      },
    });

  } catch (error) {
    logger.error('Error generating follow-up sequence', error instanceof Error ? error : new Error('Unknown error'), {
      userId,
      messageId: '[REDACTED]',
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        error: 'Failed to generate follow-up sequence',
        code: 'SEQUENCE_GENERATION_FAILED',
        metadata: {
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }
}

async function optimizeSubjectLineAPI(
  db: any,
  userId: string,
  contactId: string,
  context?: any
): Promise<NextResponse> {
  try {
    // Validate and sanitize contact ID
    const sanitizedContactId = sanitizeInput(contactId);

    if (!sanitizedContactId) {
      return NextResponse.json(
        { error: 'Invalid contact ID', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    logger.info('Optimizing subject line', {
      userId,
      contactId: '[REDACTED]',
      hasContext: !!context,
      timestamp: new Date().toISOString(),
    });

    // Get contact information with retry
    const contact: any[] = await retryWithBackoff(
      () => db.select().from(Contacts).where(
        and(eq(Contacts.id, sanitizedContactId), eq(Contacts.userId, userId))
      ).limit(1),
      3,
      1000
    );

    if (!contact || contact.length === 0) {
      logger.warn('Contact not found for subject line optimization', {
        userId,
        contactId: '[REDACTED]',
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json(
        { error: 'Contact not found', code: 'CONTACT_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Generate optimized subject line with retry
    const optimizedSubject = await retryWithBackoff(
      () => optimizeSubjectLine(contact[0], context),
      3,
      2000
    );

    logger.info('Subject line optimized successfully', {
      userId,
      subjectLength: optimizedSubject?.length || 0,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      subject: optimizedSubject,
      metadata: {
        contactId: '[REDACTED]',
        timestamp: new Date().toISOString(),
        apiVersion: 'v1',
      },
    });

  } catch (error) {
    logger.error('Error optimizing subject line', error instanceof Error ? error : new Error('Unknown error'), {
      userId,
      contactId: '[REDACTED]',
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        error: 'Failed to optimize subject line',
        code: 'OPTIMIZATION_FAILED',
        metadata: {
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }
}

async function analyzeContactIntentAPI(
  db: any,
  userId: string,
  contactId: string
): Promise<NextResponse> {
  try {
    // Validate and sanitize contact ID
    const sanitizedContactId = sanitizeInput(contactId);

    if (!sanitizedContactId) {
      return NextResponse.json(
        { error: 'Invalid contact ID', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    logger.info('Analyzing contact intent', {
      userId,
      contactId: '[REDACTED]',
      timestamp: new Date().toISOString(),
    });

    // Get contact information with retry
    const contact: any[] = await retryWithBackoff(
      () => db.select().from(Contacts).where(
        and(eq(Contacts.id, sanitizedContactId), eq(Contacts.userId, userId))
      ).limit(1),
      3,
      1000
    );

    if (!contact || contact.length === 0) {
      logger.warn('Contact not found for intent analysis', {
        userId,
        contactId: '[REDACTED]',
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json(
        { error: 'Contact not found', code: 'CONTACT_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Get message history with retry
    const messageHistory: any[] = await retryWithBackoff(
      () => db.select()
        .from(Messages)
        .where(
          and(
            eq(Messages.contactId, sanitizedContactId),
            eq(Messages.userId, userId)
          )
        )
        .orderBy(desc(Messages.createdAt)),      3,
      1000
    );

    // Analyze contact intent with retry
    const intentAnalysis = await retryWithBackoff(
      () => analyzeContactIntent(contact[0], messageHistory),
      3,
      2000
    );

    logger.info('Contact intent analyzed successfully', {
      userId,
      messageCount: messageHistory.length,
      hasAnalysis: !!intentAnalysis,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      analysis: intentAnalysis,
      metadata: {
        contactId: '[REDACTED]',
        messageCount: messageHistory.length,
        timestamp: new Date().toISOString(),
        apiVersion: 'v1',
      },
    });

  } catch (error) {
    logger.error('Error analyzing contact intent', error instanceof Error ? error : new Error('Unknown error'), {
      userId,
      contactId: '[REDACTED]',
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        error: 'Failed to analyze contact intent',
        code: 'ANALYSIS_FAILED',
        metadata: {
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }
}
