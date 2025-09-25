import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { coldOutreachRateLimit } from '@/lib/rate-limit';
import { updateTemplate, deleteTemplate, getTemplateById } from '@/lib/cold-outreach/templates';
import { templateSchema } from '@/utils/schema';
import { z } from 'zod';
import { logger, withPerformanceMonitoring, ValidationError, retryWithBackoff, sanitizeInput } from '@/lib/client-utils';

/**
 * Zod validation schemas for template operations
 */
const updateTemplateSchema = templateSchema.omit({ id: true, userId: true, createdAt: true, updatedAt: true }).partial();

/**
 * Audit logging functions for template operations
 */
async function auditTemplateOperation(
  operation: string,
  userId: string,
  templateId: string,
  metadata?: Record<string, any>
) {
  logger.info(`Template ${operation}`, {
    userId,
    resource: 'template',
    templateId,
    ...metadata,
    timestamp: new Date().toISOString(),
    source: 'api:cold-outreach:templates:id'
  });
}

/**
 * GET /api/cold-outreach/templates/[id]
 * Retrieves a single template by ID for the authenticated user
 * @param request - Next.js request object
 * @param params - Route parameters containing template ID
 * @returns Promise<NextResponse> - JSON response with template data
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const startTime = Date.now();
  let userId: string | null = null;

  try {
    // Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      logger.warn('Unauthorized access attempt to get template', {
        templateId: (await params).id,
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
    const templateId = sanitizeInput((await params).id);

    // Validate template ID format
    if (!templateId || templateId.length === 0) {
      return NextResponse.json(
        { error: 'Invalid template ID', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    // Rate limiting with detailed logging
    const rateLimitCheck = coldOutreachRateLimit.check(`templates_read-${session.user.id}`);
    if (!rateLimitCheck.allowed) {
      logger.warn('Rate limit exceeded for template read', {
        userId: session.user.id,
        templateId,
        retryAfter: rateLimitCheck.retryAfter,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json(
        {
          error: 'Rate limit exceeded. Please try again later.',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: rateLimitCheck.retryAfter,
        },
        { status: 429 }
      );
    }

    logger.info('Fetching template by ID', {
      userId,
      templateId,
      timestamp: new Date().toISOString(),
    });

    // Fetch template with retry logic
    const template = await retryWithBackoff(
      () => getTemplateById(templateId, session.user.id),
      3,
      1000
    );

    if (!template) {
      logger.warn('Template not found', {
        userId,
        templateId,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json(
        { error: 'Template not found', code: 'TEMPLATE_NOT_FOUND' },
        { status: 404 }
      );
    }

    const responseTime = Date.now() - startTime;

    logger.info('Template retrieved successfully', {
      userId,
      templateId,
      templateName: template.name,
      responseTime,
      timestamp: new Date().toISOString(),
    });

    // Audit log the read operation
    await auditTemplateOperation('read', userId, templateId, {
      templateName: template.name,
      category: template.category,
    });

    return NextResponse.json({
      template,
      metadata: {
        responseTime,
        timestamp: new Date().toISOString(),
        apiVersion: 'v1',
      },
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;

    logger.error('Error fetching template', error instanceof Error ? error : new Error('Unknown error'), {
      userId,
      templateId: (await params).id,
      responseTime,
      timestamp: new Date().toISOString(),
    });

    if (error instanceof ValidationError) {
      return NextResponse.json(
        {
          error: error.message,
          code: 'VALIDATION_ERROR',
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
}

/**
 * PUT /api/cold-outreach/templates/[id]
 * Updates an existing template for the authenticated user
 * @param request - Next.js request object containing update data
 * @param params - Route parameters containing template ID
 * @returns Promise<NextResponse> - JSON response with updated template
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const startTime = Date.now();
  let userId: string | null = null;

  try {
    // Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      logger.warn('Unauthorized access attempt to update template', {
        templateId: (await params).id,
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
    const templateId = sanitizeInput((await params).id);

    // Validate template ID format
    if (!templateId || templateId.length === 0) {
      return NextResponse.json(
        { error: 'Invalid template ID', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    // Rate limiting with detailed logging
    const rateLimitCheck = coldOutreachRateLimit.check(`templates_write-${session.user.id}`);
    if (!rateLimitCheck.allowed) {
      logger.warn('Rate limit exceeded for template update', {
        userId: session.user.id,
        templateId,
        retryAfter: rateLimitCheck.retryAfter,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json(
        {
          error: 'Rate limit exceeded. Please try again later.',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: rateLimitCheck.retryAfter,
        },
        { status: 429 }
      );
    }

    // Parse and validate request body
    let body: any;
    try {
      body = await request.json();
    } catch (parseError) {
      logger.warn('Invalid JSON in template update request', {
        userId,
        templateId,
        error: parseError instanceof Error ? parseError.message : 'Invalid JSON',
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json(
        { error: 'Invalid JSON payload', code: 'INVALID_JSON' },
        { status: 400 }
      );
    }

    // Validate input with Zod schema
    const validatedData = updateTemplateSchema.parse(body);

    // Sanitize input data
    const sanitizedData = {
      ...(validatedData.name !== undefined && { name: sanitizeInput(validatedData.name).trim() }),
      ...(validatedData.subject !== undefined && { subject: sanitizeInput(validatedData.subject).trim() }),
      ...(validatedData.content !== undefined && { content: sanitizeInput(validatedData.content).trim() }),
      ...(validatedData.category !== undefined && { category: sanitizeInput(validatedData.category).trim() }),
      ...(validatedData.tags !== undefined && { tags: validatedData.tags.map((tag: string) => sanitizeInput(tag).trim()).filter(Boolean) }),
      ...(validatedData.isFavorite !== undefined && { isFavorite: validatedData.isFavorite }),
      ...(validatedData.isPublic !== undefined && { isPublic: validatedData.isPublic }),
    };

    logger.info('Updating template', {
      userId,
      templateId,
      updateFields: Object.keys(sanitizedData),
      timestamp: new Date().toISOString(),
    });

    // Update template with retry logic
    const template = await retryWithBackoff(
      () => updateTemplate(templateId, session.user.id, sanitizedData),
      3,
      1000
    );

    if (!template) {
      logger.warn('Template not found for update', {
        userId,
        templateId,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json(
        { error: 'Template not found', code: 'TEMPLATE_NOT_FOUND' },
        { status: 404 }
      );
    }

    const responseTime = Date.now() - startTime;

    logger.info('Template updated successfully', {
      userId,
      templateId,
      templateName: template.name,
      responseTime,
      timestamp: new Date().toISOString(),
    });

    // Audit log the update operation
    await auditTemplateOperation('update', userId, templateId, {
      templateName: template.name,
      updatedFields: Object.keys(sanitizedData),
      category: template.category,
      isPublic: template.isPublic,
    });

    return NextResponse.json({
      template,
      metadata: {
        responseTime,
        timestamp: new Date().toISOString(),
        apiVersion: 'v1',
      },
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;

    logger.error('Error updating template', error instanceof Error ? error : new Error('Unknown error'), {
      userId,
      templateId: (await params).id,
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
}

/**
 * DELETE /api/cold-outreach/templates/[id]
 * Deletes a template for the authenticated user
 * @param request - Next.js request object
 * @param params - Route parameters containing template ID
 * @returns Promise<NextResponse> - JSON response confirming deletion
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const startTime = Date.now();
  let userId: string | null = null;

  try {
    // Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      logger.warn('Unauthorized access attempt to delete template', {
        templateId: (await params).id,
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
    const templateId = sanitizeInput((await params).id);

    // Validate template ID format
    if (!templateId || templateId.length === 0) {
      return NextResponse.json(
        { error: 'Invalid template ID', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    // Rate limiting with detailed logging
    const rateLimitCheck = coldOutreachRateLimit.check(`templates_write-${session.user.id}`);
    if (!rateLimitCheck.allowed) {
      logger.warn('Rate limit exceeded for template deletion', {
        userId: session.user.id,
        templateId,
        retryAfter: rateLimitCheck.retryAfter,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json(
        {
          error: 'Rate limit exceeded. Please try again later.',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: rateLimitCheck.retryAfter,
        },
        { status: 429 }
      );
    }

    logger.info('Deleting template', {
      userId,
      templateId,
      timestamp: new Date().toISOString(),
    });

    // Get template info before deletion for audit logging
    const templateBeforeDeletion = await retryWithBackoff(
      () => getTemplateById(templateId, session.user.id),
      3,
      1000
    );

    if (!templateBeforeDeletion) {
      logger.warn('Template not found for deletion', {
        userId,
        templateId,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json(
        { error: 'Template not found', code: 'TEMPLATE_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Delete template with retry logic
    const success = await retryWithBackoff(
      () => deleteTemplate(templateId, session.user.id),
      3,
      1000
    );

    if (!success) {
      logger.error('Template deletion failed', undefined, {
        userId,
        templateId,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json(
        { error: 'Failed to delete template', code: 'DELETE_FAILED' },
        { status: 500 }
      );
    }

    const responseTime = Date.now() - startTime;

    logger.info('Template deleted successfully', {
      userId,
      templateId,
      templateName: templateBeforeDeletion.name,
      responseTime,
      timestamp: new Date().toISOString(),
    });

    // Audit log the deletion
    await auditTemplateOperation('delete', userId, templateId, {
      templateName: templateBeforeDeletion.name,
      category: templateBeforeDeletion.category,
      isPublic: templateBeforeDeletion.isPublic,
    });

    return NextResponse.json({
      message: 'Template deleted successfully',
      metadata: {
        responseTime,
        timestamp: new Date().toISOString(),
        apiVersion: 'v1',
      },
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;

    logger.error('Error deleting template', error instanceof Error ? error : new Error('Unknown error'), {
      userId,
      templateId: (await params).id,
      responseTime,
      timestamp: new Date().toISOString(),
    });

    if (error instanceof ValidationError) {
      return NextResponse.json(
        {
          error: error.message,
          code: 'VALIDATION_ERROR',
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
}