/**
 * @file GET /api/cold-outreach/campaigns/[id]
 * @file PUT /api/cold-outreach/campaigns/[id]
 * @file DELETE /api/cold-outreach/campaigns/[id]
 *
 * Individual campaign management API routes
 *
 * ## Features
 * - Get campaign by ID
 * - Update campaign details
 * - Delete campaign
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
import { Campaigns } from "@/utils/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { coldOutreachRateLimit } from "@/lib/cold-outreach/security-utils";
import { buildCampaignResponse } from "@/lib/cold-outreach/campaign-response";
import { campaignConfigSchema, sanitizeCampaignConfigInput } from "../route";
import { sanitizeInput as globalSanitizeInput } from "@/lib/client-utils";

// Validation schemas
const updateCampaignSchema = z.object({
  name: z.string().min(1, "Campaign name is required").max(100, "Campaign name too long").optional(),
}).merge(campaignConfigSchema);

// GET /api/cold-outreach/campaigns/[id] - Get campaign by ID
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
  const session = await requireSession();
  if (!session.user?.id) {
    return NextResponse.json({ error: "User ID not found" }, { status: 401 });
  }
  const userId = session.user.id;
    const { id: campaignId } = await params;

    // Rate limiting
    const rateLimitCheck = coldOutreachRateLimit.check(`campaigns-get-${userId}`);
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        { status: 429 }
      );
    }

    const db = getDb();

    // Get campaign with user isolation
    const campaign = await db
      .select()
      .from(Campaigns)
      .where(and(eq(Campaigns.id, campaignId), eq(Campaigns.userId, userId)))
      .limit(1);

    if (campaign.length === 0) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ campaign: buildCampaignResponse(campaign[0]) });
  } catch (error) {
    console.error("Error fetching campaign:", error);

    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Failed to fetch campaign" },
      { status: 500 }
    );
  }
}

// PUT /api/cold-outreach/campaigns/[id] - Update campaign
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
  const session = await requireSession();
  const userId = session.user?.id ?? session.user?.email ?? 'unknown';
    const { id: campaignId } = await params;

    // Rate limiting
    const rateLimitCheck = coldOutreachRateLimit.check(`campaigns-update-${userId}`);
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        { status: 429 }
      );
    }

    const body = await req.json();
  const validatedData = updateCampaignSchema.parse(body);
  const sanitizedName = validatedData.name ? globalSanitizeInput(validatedData.name.trim()) : undefined;
  const sanitizedConfig = sanitizeCampaignConfigInput(validatedData);

    const db = getDb();

    // Check if campaign exists and belongs to user
    const existingCampaign = await db
      .select()
      .from(Campaigns)
      .where(and(eq(Campaigns.id, campaignId), eq(Campaigns.userId, userId)))
      .limit(1);

    if (existingCampaign.length === 0) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {};

    if (sanitizedName !== undefined) {
      updateData.name = sanitizedName;
    }

    if (sanitizedConfig.description !== undefined) updateData.description = sanitizedConfig.description;
    if (sanitizedConfig.status !== undefined) updateData.status = sanitizedConfig.status;
    if (sanitizedConfig.priority !== undefined) updateData.priority = sanitizedConfig.priority;
    if (sanitizedConfig.startDate !== undefined) updateData.startDate = sanitizedConfig.startDate ?? null;
    if (sanitizedConfig.endDate !== undefined) updateData.endDate = sanitizedConfig.endDate ?? null;
    if (sanitizedConfig.timezone !== undefined) updateData.timezone = sanitizedConfig.timezone;
    if (sanitizedConfig.scheduleType !== undefined) updateData.scheduleType = sanitizedConfig.scheduleType;
    if (sanitizedConfig.targetSegments !== undefined) updateData.targetSegments = sanitizedConfig.targetSegments;
    if (sanitizedConfig.targetContacts !== undefined) updateData.targetContacts = sanitizedConfig.targetContacts;
    if (sanitizedConfig.exclusionRules !== undefined) updateData.exclusionRules = sanitizedConfig.exclusionRules;
    if (sanitizedConfig.fromEmail !== undefined) updateData.fromEmail = sanitizedConfig.fromEmail;
    if (sanitizedConfig.fromName !== undefined) updateData.fromName = sanitizedConfig.fromName;
    if (sanitizedConfig.replyToEmail !== undefined) updateData.replyToEmail = sanitizedConfig.replyToEmail;
    if (sanitizedConfig.dailyLimit !== undefined) updateData.dailyLimit = sanitizedConfig.dailyLimit;
    if (sanitizedConfig.totalLimit !== undefined) updateData.totalLimit = sanitizedConfig.totalLimit;
    if (sanitizedConfig.primaryTemplateId !== undefined) updateData.primaryTemplateId = sanitizedConfig.primaryTemplateId;
    if (sanitizedConfig.followUpTemplates !== undefined) updateData.followUpTemplates = sanitizedConfig.followUpTemplates;
    if (sanitizedConfig.abTestingEnabled !== undefined) updateData.abTestingEnabled = sanitizedConfig.abTestingEnabled;
    if (sanitizedConfig.abTestConfig !== undefined) updateData.abTestConfig = sanitizedConfig.abTestConfig;
    if (sanitizedConfig.sequenceEnabled !== undefined) updateData.sequenceEnabled = sanitizedConfig.sequenceEnabled;
    if (sanitizedConfig.sequenceSteps !== undefined) updateData.sequenceSteps = sanitizedConfig.sequenceSteps;
    if (sanitizedConfig.goals !== undefined) updateData.goals = sanitizedConfig.goals;
    if (sanitizedConfig.trackingEnabled !== undefined) updateData.trackingEnabled = sanitizedConfig.trackingEnabled;
    if (sanitizedConfig.unsubscribeLink !== undefined) updateData.unsubscribeLink = sanitizedConfig.unsubscribeLink;
    if (sanitizedConfig.customTrackingDomain !== undefined) updateData.customTrackingDomain = sanitizedConfig.customTrackingDomain;
    if (sanitizedConfig.crmSyncEnabled !== undefined) updateData.crmSyncEnabled = sanitizedConfig.crmSyncEnabled;
    if (sanitizedConfig.crmSystem !== undefined) updateData.crmSystem = sanitizedConfig.crmSystem;
    if (sanitizedConfig.crmConfig !== undefined) updateData.crmConfig = sanitizedConfig.crmConfig;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({
        campaign: buildCampaignResponse(existingCampaign[0]),
        message: "No changes detected"
      });
    }

    updateData.updatedAt = new Date().toISOString();

    // Update campaign
    const result = await db
      .update(Campaigns)
      .set(updateData)
      .where(and(eq(Campaigns.id, campaignId), eq(Campaigns.userId, userId)))
      .returning();

    if (result.length === 0) {
      throw new Error("Failed to update campaign");
    }

    const updatedCampaign = buildCampaignResponse(result[0]);

    return NextResponse.json({
      campaign: updatedCampaign,
      message: "Campaign updated successfully"
    });
  } catch (error) {
    console.error("Error updating campaign:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid campaign data", details: error.errors },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Failed to update campaign" },
      { status: 500 }
    );
  }
}

// DELETE /api/cold-outreach/campaigns/[id] - Delete campaign
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
  const session = await requireSession();
  const userId = session.user?.id ?? session.user?.email ?? 'unknown';
    const { id: campaignId } = await params;

    // Rate limiting
    const rateLimitCheck = coldOutreachRateLimit.check(`campaigns-delete-${userId}`);
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        { status: 429 }
      );
    }

    const db = getDb();

    // Check if campaign exists and belongs to user
    const existingCampaign = await db
      .select()
      .from(Campaigns)
      .where(and(eq(Campaigns.id, campaignId), eq(Campaigns.userId, userId)))
      .limit(1);

    if (existingCampaign.length === 0) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    // Delete campaign (this will cascade delete related messages due to foreign key constraints)
    await db
      .delete(Campaigns)
      .where(and(eq(Campaigns.id, campaignId), eq(Campaigns.userId, userId)));

    return NextResponse.json({
      message: "Campaign deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting campaign:", error);

    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Failed to delete campaign" },
      { status: 500 }
    );
  }
}