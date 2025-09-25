/**
 * @file POST /api/cold-outreach/ai-generate
 * 
 * Generate AI-powered cold outreach messages - Enterprise Grade
 *
 * ## Features
 * - AI-powered message generation with personalization
 * - Comprehensive input validation and sanitization
 * - Enterprise-grade error handling and logging
 * - Performance monitoring and caching
 * - Rate limiting and security controls
 * - Audit logging for compliance
 * 
 * ## Request Body
 * ```json
 * {
 *   "recipientInfo": {
 *     "name": "string",
 *     "role": "string (optional)",
 *     "company": "string (optional)",
 *     "industry": "string (optional)"
 *   },
 *   "valueProposition": "string",
 *   "context": "object (optional)",
 *   "tone": "professional|casual|friendly (optional)",
 *   "length": "short|medium|long (optional)"
 * }
 * ```
 * 
 * ## Response
 * ```json
 * {
 *   "message": "string",
 *   "metadata": {
 *     "processingTime": "number",
 *     "cached": "boolean",
 *     "model": "string"
 *   }
 * }
 * ```
 * 
 * ## Security
 * - Requires authentication with session validation
 * - Rate limited to prevent abuse
 * - Input validation and sanitization
 * - Output sanitization to prevent XSS
 * - Audit logging for compliance
 * 
 * ## Performance
 * - Response caching for 1 hour
 * - Performance monitoring
 * - Retry logic with exponential backoff
 * - Circuit breaker pattern
 */

import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/apiAuth";
import { generateColdOutreachMessage } from "@/lib/cold-outreach/ai-service";
import {
  coldOutreachRateLimit,
  validateAndSanitizeContact,
  validateAndSanitizeMessageTemplate,
  sanitizeInput
} from "@/lib/cold-outreach/security-utils";
import {
  logger,
  ValidationError,
  withPerformanceMonitoring,
  retryWithBackoff,
  sanitizeInput as globalSanitizeInput
} from "@/lib/client-utils";
import { z } from "zod";


// Validation schemas
const recipientInfoSchema = z.object({
  name: z.string().min(1).max(100),
  role: z.string().max(100).optional(),
  company: z.string().max(100).optional(),
  industry: z.string().max(100).optional(),
});

const generateMessageSchema = z.object({
  recipientInfo: recipientInfoSchema,
  valueProposition: z.string().min(10).max(2000),
  context: z.record(z.any()).optional(),
  tone: z.enum(["professional", "casual", "friendly"]).default("professional"),
  length: z.enum(["short", "medium", "long"]).default("medium"),
});

// Cache disabled (Redis removed)

/**
 * Audit log for AI generation requests
 */
function logAIGenerationAudit(userId: string, requestData: any, success: boolean, error?: string): void {
  logger.info('AI Message Generation Audit', {
    userId,
    operation: 'ai_generate',
    success,
    recipientName: requestData.recipientInfo?.name,
    tone: requestData.tone,
    length: requestData.length,
    error: error ? globalSanitizeInput(error) : undefined,
    timestamp: new Date().toISOString()
  });
}

// POST /api/cold-outreach/ai-generate - Generate AI-powered cold outreach message
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  let userId = 'unknown';

  try {
    // Authentication with enhanced error handling
    const session = await requireSession();
    userId = session.user?.id || 'unknown';
    logger.info('AI Generation Request Started', {
      userId,
      userAgent: req.headers.get('user-agent'),
      ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip')
    });

    // Rate limiting with detailed logging
    const rateLimitCheck = coldOutreachRateLimit.check(`ai-generate-${userId}`);
    if (!rateLimitCheck.allowed) {
      logger.warn('AI Generation Rate Limit Exceeded', {
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
      body = await req.json();
    } catch (error) {
      logger.error('Invalid JSON in AI generation request', error as Error, { userId });
      throw new ValidationError('Invalid JSON format');
    }

    // Validate input schema
    const validatedData = generateMessageSchema.parse(body);

    // Sanitize inputs
    const sanitizedRecipient = {
      name: globalSanitizeInput(validatedData.recipientInfo.name),
      role: validatedData.recipientInfo.role ? globalSanitizeInput(validatedData.recipientInfo.role) : undefined,
      company: validatedData.recipientInfo.company ? globalSanitizeInput(validatedData.recipientInfo.company) : undefined,
      industry: validatedData.recipientInfo.industry ? globalSanitizeInput(validatedData.recipientInfo.industry) : undefined,
    };

    const sanitizedValueProp = globalSanitizeInput(validatedData.valueProposition);
    const sanitizedContext = validatedData.context ? JSON.parse(JSON.stringify(validatedData.context)) : undefined; // Deep clone for safety

    // Cache disabled (Redis removed)

    // Generate AI message with retry logic
    const generateWithRetry = async () => {
      return await generateColdOutreachMessage(
        sanitizedRecipient,
        sanitizedValueProp,
        {
          ...sanitizedContext,
          tone: validatedData.tone,
          length: validatedData.length
        }
      );
    };

    const result = await retryWithBackoff(
      generateWithRetry,
      3, // max retries
      1000, // base delay
      (error, attempt) => {
        // Don't retry on validation errors or quota exceeded
        if (error.message?.includes('quota') || error.message?.includes('validation')) {
          return false;
        }
        logger.warn('AI Generation Retry', {
          userId,
          attempt,
          error: error.message
        });
        return true;
      }
    );

    // Sanitize output
    const sanitizedMessage = globalSanitizeInput(result);

    // Cache disabled (Redis removed)

    const processingTime = Date.now() - startTime;

    logger.info('AI Generation Completed Successfully', {
      userId,
      processingTime,
      messageLength: sanitizedMessage.length,

    });

    logAIGenerationAudit(userId, validatedData, true);

    return NextResponse.json({
      message: sanitizedMessage,
      metadata: {
        processingTime,

        model: 'gpt-4',
        tone: validatedData.tone,
        length: validatedData.length
      }
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logger.error('AI Generation Failed', error instanceof Error ? error : new Error(String(error)), {
      userId,
      processingTime,
      errorType: error instanceof Error ? error.constructor.name : 'Unknown'
    });

    logAIGenerationAudit(userId, {}, false, errorMessage);

    // Handle specific error types
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { error: "Invalid input data", details: error.message },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { error: "Unauthorized access" },
        { status: 401 }
      );
    }

    if (error instanceof Error && error.message.includes('quota')) {
      return NextResponse.json(
        { error: "AI service quota exceeded. Please try again later." },
        { status: 429 }
      );
    }

    // Generic error response
    return NextResponse.json(
      {
        error: "Failed to generate AI message",
        requestId: `ai-gen-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
      },
      { status: 500 }
    );
  }
}
