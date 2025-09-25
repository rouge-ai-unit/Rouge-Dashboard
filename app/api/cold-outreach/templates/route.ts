import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { coldOutreachRateLimit } from '@/lib/rate-limit';
import { createTemplate, getTemplatesByUserId, updateTemplate, deleteTemplate } from '@/lib/cold-outreach/templates';
import { templateSchema } from '@/utils/schema';
import { z } from 'zod';
import { logger, withPerformanceMonitoring, ValidationError, retryWithBackoff, sanitizeInput } from '@/lib/client-utils';

/**
 * Zod validation schemas for template operations
 */
const createTemplateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  subject: z.string().min(1, 'Subject is required').max(200, 'Subject must be less than 200 characters'),
  content: z.string().min(1, 'Content is required').max(10000, 'Content must be less than 10,000 characters'),
  category: z.string().optional().default('General'),
  tags: z.array(z.string()).optional().default([]),
  isFavorite: z.boolean().optional().default(false),
  isPublic: z.boolean().optional().default(false),
});

const updateTemplateSchema = createTemplateSchema.partial();

/**
 * Audit logging functions for template operations
 */
async function auditTemplateOperation(
  operation: string,
  userId: string,
  templateId?: string,
  metadata?: Record<string, any>
) {
  logger.info(`Template ${operation}`, {
    userId,
    resource: 'template',
    templateId,
    ...metadata,
    timestamp: new Date().toISOString(),
    source: 'api:cold-outreach:templates'
  });
}

/**
 * GET /api/cold-outreach/templates
 * Retrieves a paginated list of templates for the authenticated user
 * @param request - Next.js request object
 * @returns Promise<NextResponse> - JSON response with templates and pagination metadata
 */
export const GET = withPerformanceMonitoring(
  async (request: NextRequest): Promise<NextResponse> => {
    const startTime = Date.now();
    let userId: string | null = null;

    try {
      // Authentication
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        logger.warn('Unauthorized access attempt to templates API', {
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
      const rateLimitCheck = coldOutreachRateLimit.check(`templates_read-${session.user.id}`);
      if (!rateLimitCheck.allowed) {
        logger.warn('Rate limit exceeded for templates read', {
          userId: session.user.id,
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

      // Parse and validate query parameters
      const { searchParams } = new URL(request.url);
      const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
      const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') || '50')), 100);
      const search = sanitizeInput(searchParams.get('search') || '');
      const category = searchParams.get('category')?.trim() || undefined;
      const tags = searchParams.get('tags')?.split(',').map(tag => tag.trim()).filter(Boolean);
      const performance = searchParams.get('performance')?.trim() || undefined;
      const sortBy = searchParams.get('sortBy')?.trim() || 'updated';
      const sortOrder = (searchParams.get('sortOrder')?.trim() || 'desc') as 'asc' | 'desc';
      const favoritesOnly = searchParams.get('favoritesOnly') === 'true';

      // Validate sort parameters
      const validSortFields = ['name', 'created', 'updated', 'performance'];
      if (!validSortFields.includes(sortBy)) {
        return NextResponse.json(
          {
            error: 'Invalid sort field',
            code: 'INVALID_SORT_FIELD',
            validFields: validSortFields,
          },
          { status: 400 }
        );
      }

      const offset = (page - 1) * limit;

      logger.info('Fetching templates with filters', {
        userId,
        page,
        limit,
        search: search ? '[REDACTED]' : undefined,
        category,
        tagsCount: tags?.length || 0,
        performance,
        sortBy,
        sortOrder,
        favoritesOnly,
        timestamp: new Date().toISOString(),
      });

      // Fetch templates with retry logic
      const [templates, allTemplates] = await Promise.all([
        retryWithBackoff(
          () => getTemplatesByUserId(session.user.id, {
            limit,
            offset,
            search,
            category,
            tags,
            performance,
            sortBy,
            sortOrder,
            favoritesOnly,
          }),
          3,
          1000
        ),
        retryWithBackoff(
          () => getTemplatesByUserId(session.user.id, {
            search,
            category,
            tags,
            performance,
            favoritesOnly,
          }),
          3,
          1000
        ),
      ]);

      const totalPages = Math.ceil(allTemplates.length / limit);
      const responseTime = Date.now() - startTime;

      logger.info('Templates fetched successfully', {
        userId,
        templateCount: templates.length,
        totalCount: allTemplates.length,
        page,
        totalPages,
        responseTime,
        timestamp: new Date().toISOString(),
      });

      // Audit log the read operation
      await auditTemplateOperation('list', userId, undefined, {
        page,
        limit,
        search: search ? '[FILTERED]' : undefined,
        category,
        tagsCount: tags?.length || 0,
        resultCount: templates.length,
      });

      return NextResponse.json({
        templates,
        pagination: {
          page,
          limit,
          total: allTemplates.length,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
        metadata: {
          responseTime,
          timestamp: new Date().toISOString(),
          apiVersion: 'v1',
        },
      });

    } catch (error) {
      const responseTime = Date.now() - startTime;

      logger.error('Error fetching templates', error instanceof Error ? error : new Error('Unknown error'), {
        userId,
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
  },
  'templates.list'
);

/**
 * POST /api/cold-outreach/templates
 * Creates a new template for the authenticated user
 * @param request - Next.js request object containing template data
 * @returns Promise<NextResponse> - JSON response with created template
 */
export const POST = withPerformanceMonitoring(
  async (request: NextRequest): Promise<NextResponse> => {
    const startTime = Date.now();
    let userId: string | null = null;

    try {
      // Authentication
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        logger.warn('Unauthorized access attempt to create template', {
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
      const rateLimitCheck = coldOutreachRateLimit.check(`templates_write-${session.user.id}`);
      if (!rateLimitCheck.allowed) {
        logger.warn('Rate limit exceeded for template creation', {
          userId: session.user.id,
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
        logger.warn('Invalid JSON in template creation request', {
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
      const validatedData = createTemplateSchema.parse(body);

      // Sanitize input data
      const sanitizedData = {
        name: sanitizeInput(validatedData.name).trim(),
        subject: sanitizeInput(validatedData.subject).trim(),
        content: sanitizeInput(validatedData.content).trim(),
        category: validatedData.category ? sanitizeInput(validatedData.category).trim() : 'General',
        tags: validatedData.tags?.map((tag: string) => sanitizeInput(tag).trim()).filter(Boolean) || [],
        isFavorite: validatedData.isFavorite || false,
        isPublic: validatedData.isPublic || false,
        userId: session.user.id,
      };

      logger.info('Creating new template', {
        userId,
        templateName: sanitizedData.name,
        category: sanitizedData.category,
        tagsCount: sanitizedData.tags.length,
        isPublic: sanitizedData.isPublic,
        timestamp: new Date().toISOString(),
      });

      // Create template with retry logic
      const template = await retryWithBackoff(
        () => createTemplate(sanitizedData),
        3,
        1000
      );

      const responseTime = Date.now() - startTime;

      logger.info('Template created successfully', {
        userId,
        templateId: template.id,
        templateName: template.name,
        responseTime,
        timestamp: new Date().toISOString(),
      });

      // Audit log the creation
      await auditTemplateOperation('create', userId, template.id, {
        templateName: template.name,
        category: template.category,
        isPublic: template.isPublic,
      });

      return NextResponse.json(
        {
          template,
          metadata: {
            responseTime,
            timestamp: new Date().toISOString(),
            apiVersion: 'v1',
          },
        },
        { status: 201 }
      );

    } catch (error) {
      const responseTime = Date.now() - startTime;

      logger.error('Error creating template', error instanceof Error ? error : new Error('Unknown error'), {
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
  'templates.create'
);
