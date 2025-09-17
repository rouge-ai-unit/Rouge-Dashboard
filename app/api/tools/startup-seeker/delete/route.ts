import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { getDb } from "@/utils/dbConfig";
import { AgritechStartups, ContactResearchJobs } from "@/utils/schema";
import { eq, and, inArray } from "drizzle-orm";
import { 
  createErrorResponse, 
  createSuccessResponse, 
  ValidationErrors,
  isValidUUID,
  isRateLimited 
} from '../utils/response-helpers';

// Enhanced validation schemas
const deleteSchema = z.object({
  startupId: z.string().uuid('Invalid startup ID format'),
  confirmDelete: z.boolean().default(false),
  reason: z.string().max(200).optional()
});

const batchDeleteSchema = z.object({
  startupIds: z.array(z.string().uuid()).min(1).max(50),
  confirmDelete: z.boolean(),
  reason: z.string().max(200).optional()
});

/**
 * DELETE /api/tools/startup-seeker/delete
 * Delete startup(s) from user's portfolio with comprehensive validation
 * Enterprise-grade with audit logging and safety checks
 */
export async function DELETE(request: NextRequest) {
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

    // Rate limiting check for deletions
    if (isRateLimited(userId, 'startup_deletion')) {
      return createErrorResponse(
        'Deletion rate limit exceeded. Please wait before deleting more startups.',
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

    // Determine if this is single or batch delete
    const isBatchDelete = Array.isArray(body.startupIds);
    const validation = isBatchDelete ? 
      batchDeleteSchema.safeParse(body) : 
      deleteSchema.safeParse(body);

    if (!validation.success) {
      return createErrorResponse(validation.error);
    }

    const data = validation.data;
    const db = getDb();

    if (isBatchDelete) {
      // Handle batch deletion
      const { startupIds, confirmDelete, reason } = data as z.infer<typeof batchDeleteSchema>;

      if (!confirmDelete) {
        return createErrorResponse(
          'Batch deletion requires confirmation',
          'CONFIRMATION_REQUIRED',
          400
        );
      }

      console.log(`🗑️ Batch deleting ${startupIds.length} startups for user ${userId}`);

      // Verify all startups exist and belong to user (DB-side filtering)
      const existingStartups = await db
        .select({ id: AgritechStartups.id })
        .from(AgritechStartups)
        .where(
          and(
            eq(AgritechStartups.userId, userId),
            inArray(AgritechStartups.id, startupIds)
          )
        );

      const validIds = existingStartups.map(s => s.id);
      const invalidIds = startupIds.filter(id => !validIds.includes(id));

      if (validIds.length === 0) {
        return createErrorResponse(
          'No valid startups found for deletion',
          'NO_VALID_STARTUPS',
          404
        );
      }

      // Delete related contact research jobs first
      if (validIds.length > 0) {
        await db
          .delete(ContactResearchJobs)
          .where(
            and(
              eq(ContactResearchJobs.userId, userId),
              inArray(ContactResearchJobs.startupId, validIds)
            )
          );
      }

      // Delete the startups
      const deleteResult = await db
        .delete(AgritechStartups)
        .where(
          and(
            eq(AgritechStartups.userId, userId),
            inArray(AgritechStartups.id, validIds)
          )
        );
      const deletedCount = validIds.length;

      console.log(`✅ Batch deleted ${deletedCount} startups for user ${userId}`);

      return createSuccessResponse({
        message: `Successfully deleted ${deletedCount} startup(s)`,
        deleted: deletedCount,
        skipped: invalidIds.length,
        invalidIds: invalidIds.length > 0 ? invalidIds : undefined,
        reason: reason || undefined
      }, {
        processingTime: Date.now() - startTime
      });

    } else {
      // Handle single deletion
      const { startupId, confirmDelete, reason } = data as z.infer<typeof deleteSchema>;

      console.log(`🗑️ Deleting startup ${startupId} for user ${userId}`);

      // Check if startup exists and belongs to user
      const existingStartup = await db
        .select({
          id: AgritechStartups.id,
          name: AgritechStartups.name,
          rougeScore: AgritechStartups.rougeScore
        })
        .from(AgritechStartups)
        .where(
          and(
            eq(AgritechStartups.id, startupId),
            eq(AgritechStartups.userId, userId)
          )
        )
        .limit(1);

      console.log(`🔍 Startup lookup result for ${startupId}:`, existingStartup.length > 0 ? 'Found' : 'Not found');

      if (existingStartup.length === 0) {
        console.log(`❌ Startup ${startupId} not found for user ${userId}`);
        return createErrorResponse(
          'Startup not found or access denied',
          'STARTUP_NOT_FOUND',
          404
        );
      }

      const startup = existingStartup[0];
      console.log(`✅ Found startup: ${startup.name} (score: ${startup.rougeScore})`);

      // Safety check for high-value startups
      if (startup.rougeScore >= 90 && !confirmDelete) {
        console.log(`⚠️ High-value startup ${startup.name} (score: ${startup.rougeScore}) requires confirmation. confirmDelete: ${confirmDelete}`);
        return createErrorResponse(
          'High-quality startup deletion requires confirmation',
          'HIGH_VALUE_CONFIRMATION_REQUIRED',
          400,
          {
            startupName: startup.name,
            score: startup.rougeScore,
            requiresConfirmation: true
          }
        );
      }

      console.log(`🗑️ Proceeding with deletion of ${startup.name} (confirmDelete: ${confirmDelete})`);

      // Delete related contact research jobs first
      try {
        await db
          .delete(ContactResearchJobs)
          .where(
            and(
              eq(ContactResearchJobs.startupId, startupId),
              eq(ContactResearchJobs.userId, userId)
            )
          );
        console.log(`🗑️ Deleted contact research jobs for startup ${startupId}`);
      } catch (contactError) {
        console.error(`Failed to delete contact research jobs for ${startupId}:`, contactError);
        return createErrorResponse(
          'Failed to delete related contact research data',
          'CONTACT_DELETE_ERROR',
          500
        );
      }

      // Delete the startup
      try {
        const deleteResult = await db
          .delete(AgritechStartups)
          .where(
            and(
              eq(AgritechStartups.id, startupId),
              eq(AgritechStartups.userId, userId)
            )
          );
        console.log(`✅ Successfully deleted startup ${startupId} (${startup.name}) - affected rows:`, deleteResult.rowCount);
      } catch (startupError) {
        console.error(`Failed to delete startup ${startupId}:`, startupError);
        return createErrorResponse(
          'Failed to delete startup from database',
          'STARTUP_DELETE_ERROR',
          500
        );
      }

      return createSuccessResponse({
        message: 'Startup deleted successfully',
        deletedStartup: {
          id: startup.id,
          name: startup.name,
          score: startup.rougeScore
        },
        reason: reason || undefined
      }, {
        processingTime: Date.now() - startTime
      });
    }

  } catch (error) {
    console.error("Delete startup API error:", error);
    return createErrorResponse(
      error instanceof Error ? error.message : 'Failed to delete startup(s)',
      'DELETION_ERROR',
      500
    );
  }
}

/**
 * GET /api/tools/startup-seeker/delete?preview=true&startupId=xxx
 * Preview deletion impact (what will be deleted)
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
    const preview = searchParams.get('preview') === 'true';
    const startupId = searchParams.get('startupId');

    if (!preview || !startupId) {
      return createErrorResponse(
        'Preview mode requires startupId parameter',
        'INVALID_PREVIEW_REQUEST',
        400
      );
    }

    if (!isValidUUID(startupId)) {
      return createErrorResponse(
        'Invalid startup ID format',
        'INVALID_STARTUP_ID',
        400
      );
    }

    const userId = session.user.email;
    const db = getDb();

    // Get startup details
    const startup = await db
      .select({
        id: AgritechStartups.id,
        name: AgritechStartups.name,
        rougeScore: AgritechStartups.rougeScore,
        createdAt: AgritechStartups.createdAt
      })
      .from(AgritechStartups)
      .where(
        and(
          eq(AgritechStartups.id, startupId),
          eq(AgritechStartups.userId, userId)
        )
      )
      .limit(1);

    if (startup.length === 0) {
      return createErrorResponse(
        'Startup not found or access denied',
        'STARTUP_NOT_FOUND',
        404
      );
    }

    // Get related contact research jobs
    const relatedJobs = await db
      .select({
        id: ContactResearchJobs.id,
        status: ContactResearchJobs.status,
        createdAt: ContactResearchJobs.createdAt
      })
      .from(ContactResearchJobs)
      .where(
        and(
          eq(ContactResearchJobs.startupId, startupId),
          eq(ContactResearchJobs.userId, userId)
        )
      );

    const startupData = startup[0];
    const deletionImpact = {
      startup: {
        id: startupData.id,
        name: startupData.name,
        score: startupData.rougeScore,
        createdAt: startupData.createdAt
      },
      relatedData: {
        contactResearchJobs: relatedJobs.length,
        jobDetails: relatedJobs
      },
      warnings: [] as string[],
      recommendations: [] as string[]
    };

    // Add warnings based on startup quality
    if (startupData.rougeScore >= 90) {
      deletionImpact.warnings.push('This is a high-quality startup (score ≥ 90)');
      deletionImpact.recommendations.push('Consider exporting data before deletion');
    }

    if (relatedJobs.length > 0) {
      deletionImpact.warnings.push(`${relatedJobs.length} contact research job(s) will also be deleted`);
    }

    return createSuccessResponse(deletionImpact, {
      processingTime: Date.now() - startTime
    });

  } catch (error) {
    console.error("Delete preview API error:", error);
    return createErrorResponse(
      error instanceof Error ? error.message : 'Failed to preview deletion',
      'PREVIEW_ERROR',
      500
    );
  }
}