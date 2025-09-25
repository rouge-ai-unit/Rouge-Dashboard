/**
 * @file POST /api/cold-outreach/campaigns
 * @file GET /api/cold-outreach/campaigns
 *
 * Campaign management API routes - Enterprise Grade
 *
 * ## Features
 * - Create new campaigns
 * - List campaigns with filtering and pagination
 * - Advanced analytics and performance metrics
 * - A/B testing capabilities
 * - Predictive analytics for campaign optimization
 * - Proper authentication and validation
 * - Enterprise-grade error handling
 *
 * ## Security
 * - Requires authentication
 * - User isolation (users can only access their own campaigns)
 * - Input validation and sanitization
 * - Rate limiting
 */

import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/apiAuth";
import { getDb } from "@/utils/dbConfig";
import { Campaigns, Messages } from "@/utils/schema";
import { eq, and, desc, asc, sql } from "drizzle-orm";
import { z } from "zod";
import {
  coldOutreachRateLimit
} from "@/lib/cold-outreach/security-utils";
import {
  logger,
  ValidationError,
  withPerformanceMonitoring,
  retryWithBackoff,
  sanitizeInput as globalSanitizeInput
} from "@/lib/client-utils";
import { buildCampaignResponse } from "@/lib/cold-outreach/campaign-response";

const DEV_NO_DB = !process.env.DATABASE_URL && !process.env.NEXT_PUBLIC_DATABASE_URL;

const statusEnum = z.enum(["draft", "active", "paused", "completed"]);
const priorityEnum = z.enum(["low", "medium", "high", "urgent"]);

export const followUpTemplateSchema = z.object({
  templateId: z.string(),
  delay: z.number().int().min(0),
  condition: z.string().optional(),
});

export const sequenceStepSchema = z.object({
  id: z.string(),
  name: z.string(),
  templateId: z.string(),
  delay: z.number().int().min(0),
  condition: z.string().optional(),
  maxRetries: z.number().int().min(0),
});

export const campaignConfigSchema = z.object({
  description: z.string().max(500, "Description too long").optional(),
  status: statusEnum.optional(),
  priority: priorityEnum.optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  timezone: z.string().optional(),
  scheduleType: z.string().optional(),
  targetSegments: z.array(z.string()).optional(),
  targetContacts: z.array(z.string()).optional(),
  exclusionRules: z.record(z.any()).optional(),
  fromEmail: z.string().email().optional(),
  fromName: z.string().optional(),
  replyToEmail: z.string().email().optional(),
  dailyLimit: z.number().int().min(0).optional(),
  totalLimit: z.number().int().min(0).optional(),
  primaryTemplateId: z.string().uuid().optional(),
  followUpTemplates: z.array(followUpTemplateSchema).optional(),
  abTestingEnabled: z.boolean().optional(),
  abTestConfig: z.object({
    subjectLines: z.array(z.string()).optional(),
    templates: z.array(z.string()).optional(),
    sendTimes: z.array(z.string()).optional(),
    sampleSize: z.number().optional(),
  }).optional(),
  sequenceEnabled: z.boolean().optional(),
  sequenceSteps: z.array(sequenceStepSchema).optional(),
  goals: z.object({
    targetOpenRate: z.number().optional(),
    targetClickRate: z.number().optional(),
    targetReplyRate: z.number().optional(),
    targetConversions: z.number().optional(),
  }).optional(),
  trackingEnabled: z.boolean().optional(),
  unsubscribeLink: z.boolean().optional(),
  customTrackingDomain: z.string().optional(),
  crmSyncEnabled: z.boolean().optional(),
  crmSystem: z.string().optional(),
  crmConfig: z.record(z.any()).optional(),
});

const createCampaignSchema = z.object({
  name: z.string().min(1, "Campaign name is required").max(100, "Campaign name too long"),
}).merge(campaignConfigSchema);

const querySchema = z.object({
  status: z.enum(["draft", "active", "paused", "completed"]).optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
  sortBy: z.enum(["createdAt", "updatedAt", "name", "status"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

type FollowUpTemplateInput = z.infer<typeof followUpTemplateSchema>;
type SequenceStepInput = z.infer<typeof sequenceStepSchema>;
type CampaignConfigInput = Partial<z.infer<typeof campaignConfigSchema>>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const sanitizeOptionalString = (value?: string | null): string | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return globalSanitizeInput(trimmed);
};

const sanitizeStringArray = (values?: string[] | null): string[] | undefined => {
  if (values === undefined) return undefined;
  if (values === null) return [];

  return values
    .map((value) => sanitizeOptionalString(value))
    .filter((value): value is string => typeof value === "string" && value.length > 0);
};

const sanitizeFollowUpTemplates = (
  templates?: FollowUpTemplateInput[] | null
): CampaignInsert["followUpTemplates"] | undefined => {
  if (templates === undefined) return undefined;
  if (templates === null) return [];

  return templates
    .map((template) => {
      const templateId = sanitizeOptionalString(template.templateId);
      if (typeof templateId !== "string") return null;

      const delay = Number.isFinite(template.delay) ? template.delay : 0;
      const condition = sanitizeOptionalString(template.condition) ?? undefined;

      const result: { templateId: string; delay: number; condition?: string } = {
        templateId,
        delay,
      };

      if (typeof condition === "string" && condition.length > 0) {
        result.condition = condition;
      }

      return result;
    })
    .filter((template): template is { templateId: string; delay: number; condition?: string } => template !== null);
};

const sanitizeSequenceSteps = (
  steps?: SequenceStepInput[] | null
): CampaignInsert["sequenceSteps"] | undefined => {
  if (steps === undefined) return undefined;
  if (steps === null) return [];

  return steps
    .map((step) => {
      const id = sanitizeOptionalString(step.id);
      const name = sanitizeOptionalString(step.name);
      const templateId = sanitizeOptionalString(step.templateId);

      if (typeof id !== "string" || typeof name !== "string" || typeof templateId !== "string") {
        return null;
      }

      const delay = Number.isFinite(step.delay) ? step.delay : 0;
      const maxRetries = Number.isFinite(step.maxRetries) ? step.maxRetries : 0;
      const condition = sanitizeOptionalString(step.condition) ?? undefined;

      const result: {
        id: string;
        name: string;
        templateId: string;
        delay: number;
        maxRetries: number;
        condition?: string;
      } = {
        id,
        name,
        templateId,
        delay,
        maxRetries,
      };

      if (typeof condition === "string" && condition.length > 0) {
        result.condition = condition;
      }

      return result;
    })
    .filter((step): step is {
      id: string;
      name: string;
      templateId: string;
      delay: number;
      maxRetries: number;
      condition?: string;
    } => step !== null);
};

const sanitizeGoals = (
  goals?: CampaignConfigInput["goals"]
): CampaignInsert["goals"] | undefined => {
  if (goals === undefined) return undefined;
  if (!goals) return null;

  const sanitized: NonNullable<CampaignInsert["goals"]> = {};

  if (typeof goals.targetOpenRate === "number" && Number.isFinite(goals.targetOpenRate)) {
    sanitized.targetOpenRate = goals.targetOpenRate;
  }

  if (typeof goals.targetClickRate === "number" && Number.isFinite(goals.targetClickRate)) {
    sanitized.targetClickRate = goals.targetClickRate;
  }

  if (typeof goals.targetReplyRate === "number" && Number.isFinite(goals.targetReplyRate)) {
    sanitized.targetReplyRate = goals.targetReplyRate;
  }

  if (typeof goals.targetConversions === "number" && Number.isFinite(goals.targetConversions)) {
    sanitized.targetConversions = goals.targetConversions;
  }

  return sanitized;
};

const sanitizeConfigRecord = <K extends keyof CampaignInsert>(
  key: K,
  value?: CampaignInsert[K] | Record<string, unknown> | null
): CampaignInsert[K] | undefined => {
  if (value === undefined) return undefined;
  if (value === null) return null as CampaignInsert[K];
  if (isRecord(value)) return value as CampaignInsert[K];
  return null as CampaignInsert[K];
};
const sanitizeAbTestConfig = (
  config?: CampaignConfigInput["abTestConfig"]
): CampaignInsert["abTestConfig"] | undefined => {
  if (config === undefined) return undefined;
  if (!config) return null;

  const sanitized: NonNullable<CampaignInsert["abTestConfig"]> = {
    subjectLines: [],
    templates: [],
    sendTimes: [],
    sampleSize: 0,
  };

  const subjectLines = sanitizeStringArray(config.subjectLines ?? undefined);
  if (subjectLines !== undefined) {
    sanitized.subjectLines = subjectLines;
  }

  const templates = sanitizeStringArray(config.templates ?? undefined);
  if (templates !== undefined) {
    sanitized.templates = templates;
  }

  const sendTimes = sanitizeStringArray(config.sendTimes ?? undefined);
  if (sendTimes !== undefined) {
    sanitized.sendTimes = sendTimes;
  }

  if (typeof config.sampleSize === "number" && Number.isFinite(config.sampleSize)) {
    sanitized.sampleSize = config.sampleSize;
  }

  return sanitized;
};

export function sanitizeCampaignConfigInput(input: CampaignConfigInput): Partial<CampaignInsert> {
  const sanitized: Partial<CampaignInsert> = {};

  if (input.description !== undefined) {
    sanitized.description = sanitizeOptionalString(input.description) ?? null;
  }

  if (input.status !== undefined) {
    sanitized.status = input.status;
  }

  if (input.priority !== undefined) {
    sanitized.priority = input.priority;
  }

  if (input.startDate !== undefined) {
    sanitized.startDate = input.startDate ?? null;
  }

  if (input.endDate !== undefined) {
    sanitized.endDate = input.endDate ?? null;
  }

  if (input.timezone !== undefined) {
    sanitized.timezone = sanitizeOptionalString(input.timezone) ?? null;
  }

  if (input.scheduleType !== undefined) {
    sanitized.scheduleType = sanitizeOptionalString(input.scheduleType) ?? null;
  }

  if (input.targetSegments !== undefined) {
    sanitized.targetSegments = sanitizeStringArray(input.targetSegments) ?? [];
  }

  if (input.targetContacts !== undefined) {
    sanitized.targetContacts = sanitizeStringArray(input.targetContacts) ?? [];
  }

  if (input.exclusionRules !== undefined) {
    sanitized.exclusionRules = sanitizeConfigRecord("exclusionRules", input.exclusionRules ?? {});
  }

  if (input.fromEmail !== undefined) {
    sanitized.fromEmail = sanitizeOptionalString(input.fromEmail) ?? null;
  }

  if (input.fromName !== undefined) {
    sanitized.fromName = sanitizeOptionalString(input.fromName) ?? null;
  }

  if (input.replyToEmail !== undefined) {
    sanitized.replyToEmail = sanitizeOptionalString(input.replyToEmail) ?? null;
  }

  if (input.dailyLimit !== undefined) {
    sanitized.dailyLimit = input.dailyLimit;
  }

  if (input.totalLimit !== undefined) {
    sanitized.totalLimit = input.totalLimit;
  }

  if (input.primaryTemplateId !== undefined) {
    sanitized.primaryTemplateId = sanitizeOptionalString(input.primaryTemplateId) ?? null;
  }

  if (input.followUpTemplates !== undefined) {
    sanitized.followUpTemplates = sanitizeFollowUpTemplates(input.followUpTemplates) ?? [];
  }

  if (input.abTestingEnabled !== undefined) {
    sanitized.abTestingEnabled = input.abTestingEnabled;
  }

  if (input.abTestConfig !== undefined) {
    sanitized.abTestConfig = sanitizeAbTestConfig(input.abTestConfig);
  }

  if (input.sequenceEnabled !== undefined) {
    sanitized.sequenceEnabled = input.sequenceEnabled;
  }

  if (input.sequenceSteps !== undefined) {
    sanitized.sequenceSteps = sanitizeSequenceSteps(input.sequenceSteps) ?? [];
  }

  if (input.goals !== undefined) {
    sanitized.goals = sanitizeGoals(input.goals);
  }

  if (input.trackingEnabled !== undefined) {
    sanitized.trackingEnabled = input.trackingEnabled;
  }

  if (input.unsubscribeLink !== undefined) {
    sanitized.unsubscribeLink = input.unsubscribeLink;
  }

  if (input.customTrackingDomain !== undefined) {
    sanitized.customTrackingDomain = sanitizeOptionalString(input.customTrackingDomain) ?? null;
  }

  if (input.crmSyncEnabled !== undefined) {
    sanitized.crmSyncEnabled = input.crmSyncEnabled;
  }

  if (input.crmSystem !== undefined) {
    sanitized.crmSystem = sanitizeOptionalString(input.crmSystem) ?? null;
  }

  if (input.crmConfig !== undefined) {
    sanitized.crmConfig = sanitizeConfigRecord("crmConfig", input.crmConfig ?? {});
  }

  return sanitized;
}

type CampaignInsert = typeof Campaigns.$inferInsert;

/**
 * Audit log for campaign operations
 */
function logCampaignAudit(userId: string, operation: string, campaignData: any, success: boolean, error?: string): void {
  logger.info('Campaign Operation Audit', {
    userId,
    operation,
    success,
    campaignId: campaignData?.id,
    campaignName: campaignData?.name ? globalSanitizeInput(campaignData.name) : undefined,
    campaignStatus: campaignData?.status,
    error: error ? globalSanitizeInput(error) : undefined,
    timestamp: new Date().toISOString()
  });
}

// Advanced analytics functions
// GET /api/cold-outreach/campaigns - List campaigns
export async function GET(req: NextRequest) {
  const startTime = Date.now();
  let userId = 'unknown';
  let userEmail = 'unknown';

  try {
    // Authentication with enhanced error handling
    const session = await requireSession();
    userId = session.user?.id ?? session.user?.email ?? 'unknown';
    userEmail = session.user?.email ?? 'unknown';

    logger.info('Campaign List Request Started', {
      userId,
      userEmail,
      userAgent: req.headers.get('user-agent'),
      ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip')
    });

    // Rate limiting with detailed logging
    const rateLimitCheck = coldOutreachRateLimit.check(`campaigns-get-${userId}`);
    if (!rateLimitCheck.allowed) {
      logger.warn('Campaign List Rate Limit Exceeded', {
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

    // Parse query parameters with validation
    const { searchParams } = new URL(req.url);
    const queryParams = {
      status: searchParams.get('status') || undefined,
      limit: searchParams.get('limit') || undefined,
      offset: searchParams.get('offset') || undefined,
      sortBy: searchParams.get('sortBy') || undefined,
      sortOrder: searchParams.get('sortOrder') || undefined,
    };

    const validatedQuery = querySchema.parse(queryParams);

    if (DEV_NO_DB) {
      const processingTime = Date.now() - startTime;
      logger.info('Campaign List Using Mock Data', {
        userId,
        userEmail,
        processingTime,
        queryParams: validatedQuery,
      });

      return NextResponse.json({
        campaigns: [],
        pagination: {
          total: 0,
          limit: validatedQuery.limit,
          offset: validatedQuery.offset,
          hasMore: false,
        },
        metadata: {
          processingTime,
          query: validatedQuery,
          note: 'Using mock data because DATABASE_URL is not configured.',
        },
      });
    }

    const db = getDb();

    // Build where conditions
  const whereConditions = [eq(Campaigns.userId, userId)];
    if (validatedQuery.status) {
      whereConditions.push(eq(Campaigns.status, validatedQuery.status));
    }

    // Build order by
    const orderBy = validatedQuery.sortOrder === 'asc'
      ? asc(Campaigns[validatedQuery.sortBy])
      : desc(Campaigns[validatedQuery.sortBy]);

    // Execute query with retry logic
    let campaigns: any[] = [];
    let totalCount = 0;

    try {
      [campaigns, totalCount] = await Promise.all([
        retryWithBackoff(
          () => db
            .select()
            .from(Campaigns)
            .where(and(...whereConditions))
            .orderBy(orderBy)
            .limit(validatedQuery.limit)
            .offset(validatedQuery.offset),
          3,
          1000,
          (error, attempt) => {
            logger.warn('Campaign query retry', { userId, attempt, error: error.message });
            return true; // Retry on database errors
          }
        ),
        retryWithBackoff(
          async () => {
            const result = await db
              .select({ count: sql<number>`count(*)` })
              .from(Campaigns)
              .where(and(...whereConditions));
            return result[0]?.count || 0;
          },
          3,
          1000,
          (error, attempt) => {
            logger.warn('Campaign count query retry', { userId, attempt, error: error.message });
            return true;
          }
        )
      ]);
    } catch (dbError) {
      logger.error('Database query failed for campaigns', dbError instanceof Error ? dbError : new Error(String(dbError)), {
        userId,
        queryParams: validatedQuery
      });
      throw new Error('Database query failed');
    }

    // Enhance campaigns with advanced analytics
    const enhancedCampaigns = campaigns.map(buildCampaignResponse);

    const processingTime = Date.now() - startTime;

    logger.info('Campaign List Retrieved Successfully', {
      userId,
      processingTime,
      campaignCount: campaigns.length,
      totalCount,
      queryParams: validatedQuery
    });

    return NextResponse.json({
      campaigns: enhancedCampaigns,
      pagination: {
        total: totalCount,
        limit: validatedQuery.limit,
        offset: validatedQuery.offset,
        hasMore: validatedQuery.offset + validatedQuery.limit < totalCount,
      },
      metadata: {
        processingTime,
        query: validatedQuery
      }
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logger.error('Campaign List Failed', error instanceof Error ? error : new Error(String(error)), {
      userId,
      processingTime,
      errorType: error instanceof Error ? error.constructor.name : 'Unknown'
    });

    // Handle specific error types
    if (error instanceof ValidationError || error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: error instanceof z.ZodError ? error.errors : error.message },
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
        error: "Failed to fetch campaigns",
        requestId: `campaign-list-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
      },
      { status: 500 }
    );
  }
}

// POST /api/cold-outreach/campaigns - Create campaign
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  let userId = 'unknown';
  let userEmail = 'unknown';

  try {
    // Authentication with enhanced error handling
    const session = await requireSession();
    userId = session.user?.id ?? session.user?.email ?? 'unknown';
    userEmail = session.user?.email ?? 'unknown';

    logger.info('Campaign Create Request Started', {
      userId,
      userEmail,
      userAgent: req.headers.get('user-agent'),
      ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip')
    });

    // Rate limiting with detailed logging
    const rateLimitCheck = coldOutreachRateLimit.check(`campaigns-create-${userId}`);
    if (!rateLimitCheck.allowed) {
      logger.warn('Campaign Create Rate Limit Exceeded', {
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
      logger.error('Invalid JSON in campaign create request', error as Error, { userId });
      throw new ValidationError('Invalid JSON format');
    }

    // Validate input schema
    const validatedData = createCampaignSchema.parse(body);

    // Sanitize inputs
    const sanitizedName = globalSanitizeInput(validatedData.name.trim());
    const sanitizedConfig = sanitizeCampaignConfigInput(validatedData);
    const sanitizedPayload = { name: sanitizedName, ...sanitizedConfig };

    const db = getDb();

    // Create campaign with retry logic
    const newCampaign: CampaignInsert = {
      ...sanitizedConfig,
      userId,
      name: sanitizedName,
      status: sanitizedConfig.status ?? 'draft',
      description: sanitizedConfig.description ?? null,
      startDate: sanitizedConfig.startDate ?? null,
      endDate: sanitizedConfig.endDate ?? null,
      sentCount: 0,
      openedCount: 0,
      repliedCount: 0,
      bouncedCount: 0,
    };

    let result: any[] = [];
    try {
      result = await retryWithBackoff(
        () => db.insert(Campaigns).values(newCampaign).returning(),
        3,
        1000,
        (error, attempt) => {
          logger.warn('Campaign creation retry', { userId, attempt, error: error.message });
          return true; // Retry on database errors
        }
      );
    } catch (dbError) {
      logger.error('Database insert failed for campaign creation', dbError instanceof Error ? dbError : new Error(String(dbError)), {
        userId,
        campaignData: sanitizedPayload
      });
      throw new Error('Database insert failed');
    }

    if (result.length === 0) {
      throw new Error("Failed to create campaign");
    }

    const processingTime = Date.now() - startTime;

    logger.info('Campaign Created Successfully', {
      userId,
      processingTime,
      campaignId: result[0].id,
      campaignName: sanitizedName
    });

    const campaignResponse = buildCampaignResponse(result[0]);

    logCampaignAudit(userId, 'create', campaignResponse, true);

    return NextResponse.json({
      campaign: campaignResponse,
      message: "Campaign created successfully",
      metadata: {
        processingTime
      }
    }, { status: 201 });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logger.error('Campaign Create Failed', error instanceof Error ? error : new Error(String(error)), {
      userId,
      processingTime,
      errorType: error instanceof Error ? error.constructor.name : 'Unknown'
    });

    logCampaignAudit(userId, 'create', {}, false, errorMessage);

    // Handle specific error types
    if (error instanceof ValidationError || error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid campaign data", details: error instanceof z.ZodError ? error.errors : error.message },
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
        error: "Failed to create campaign",
        requestId: `campaign-create-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
      },
      { status: 500 }
    );
  }
}
