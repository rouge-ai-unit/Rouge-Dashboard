import { getDb } from "@/utils/dbConfig";
import { Campaigns } from "@/utils/schema";
import { eq, and } from "drizzle-orm";

export interface Campaign {
  id?: string;
  name: string;
  description?: string | null;
  status: string;
  userId: string;
  createdAt?: Date;
  updatedAt?: Date;
  startDate?: Date | null;
  endDate?: Date | null;
  sentCount?: number;
  openedCount?: number;
  repliedCount?: number;
  bounceCount?: number;
}

// Database type with string dates
interface CampaignDb {
  id?: string;
  name: string;
  description?: string | null;
  status: string;
  userId: string;
  createdAt?: string;
  updatedAt?: string;
  startDate?: string | null;
  endDate?: string | null;
  sentCount?: number;
  openedCount?: number;
  repliedCount?: number;
  bounceCount?: number;
}

/**
 * Get all campaigns for a user
 */
export async function getCampaignsByUserId(userId: string) {
  const db = getDb();
  const results = await db.select().from(Campaigns).where(eq(Campaigns.userId, userId));
  
  // Convert string dates back to Date objects
  return results.map(campaign => ({
    ...campaign,
    createdAt: campaign.createdAt ? new Date(campaign.createdAt) : undefined,
    updatedAt: campaign.updatedAt ? new Date(campaign.updatedAt) : undefined,
    startDate: campaign.startDate ? new Date(campaign.startDate) : null,
    endDate: campaign.endDate ? new Date(campaign.endDate) : null,
    sentCount: campaign.sentCount || 0,
    openedCount: campaign.openedCount || 0,
    repliedCount: campaign.repliedCount || 0,
    bounceCount: campaign.bouncedCount || 0,
  }));
}

/**
 * Get a campaign by ID and user ID
 */
export async function getCampaignById(id: string, userId: string) {
  const db = getDb();
  const result = await db.select().from(Campaigns).where(
    and(
      eq(Campaigns.id, id),
      eq(Campaigns.userId, userId)
    )
  );
  
  if (result.length === 0) return null;
  
  const campaign = result[0];
  // Convert string dates back to Date objects
  return {
    ...campaign,
    createdAt: campaign.createdAt ? new Date(campaign.createdAt) : undefined,
    updatedAt: campaign.updatedAt ? new Date(campaign.updatedAt) : undefined,
    startDate: campaign.startDate ? new Date(campaign.startDate) : null,
    endDate: campaign.endDate ? new Date(campaign.endDate) : null,
    sentCount: campaign.sentCount || 0,
    openedCount: campaign.openedCount || 0,
    repliedCount: campaign.repliedCount || 0,
    bounceCount: campaign.bouncedCount || 0,
  };
}

/**
 * Create a new campaign
 */
export async function createCampaign(campaign: Omit<Campaign, 'id' | 'createdAt' | 'updatedAt'>) {
  const db = getDb();
  
  // Prepare data for database (convert Date objects to ISO strings)
  const campaignDb: any = {
    name: campaign.name,
    description: campaign.description,
    status: campaign.status,
    userId: campaign.userId,
  };
  
  // Handle date conversions
  if (campaign.startDate instanceof Date) {
    campaignDb.startDate = campaign.startDate.toISOString();
  } else if (campaign.startDate !== undefined) {
    campaignDb.startDate = campaign.startDate;
  }
  
  if (campaign.endDate instanceof Date) {
    campaignDb.endDate = campaign.endDate.toISOString();
  } else if (campaign.endDate !== undefined) {
    campaignDb.endDate = campaign.endDate;
  }
  
  const newCampaign = {
    ...campaignDb,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  const result = await db.insert(Campaigns).values(newCampaign).returning();
  
  if (result.length === 0) throw new Error("Failed to create campaign");
  
  const insertedCampaign = result[0];
  // Convert string dates back to Date objects
  return {
    ...insertedCampaign,
    createdAt: insertedCampaign.createdAt ? new Date(insertedCampaign.createdAt) : undefined,
    updatedAt: insertedCampaign.updatedAt ? new Date(insertedCampaign.updatedAt) : undefined,
    startDate: insertedCampaign.startDate ? new Date(insertedCampaign.startDate) : null,
    endDate: insertedCampaign.endDate ? new Date(insertedCampaign.endDate) : null,
  };
}

/**
 * Update a campaign
 */
export async function updateCampaign(id: string, userId: string, campaign: Partial<Campaign>) {
  const db = getDb();
  
  // Prepare data for database (convert Date objects to ISO strings)
  const campaignDb: any = {};
  
  // Handle each property individually to ensure proper type conversion
  if (campaign.name !== undefined) campaignDb.name = campaign.name;
  if (campaign.description !== undefined) campaignDb.description = campaign.description;
  if (campaign.status !== undefined) campaignDb.status = campaign.status;
  if (campaign.userId !== undefined) campaignDb.userId = campaign.userId;
  
  // Handle date conversions
  if (campaign.startDate instanceof Date) {
    campaignDb.startDate = campaign.startDate.toISOString();
  } else if (campaign.startDate !== undefined) {
    campaignDb.startDate = campaign.startDate;
  }
  
  if (campaign.endDate instanceof Date) {
    campaignDb.endDate = campaign.endDate.toISOString();
  } else if (campaign.endDate !== undefined) {
    campaignDb.endDate = campaign.endDate;
  }
  
  // Only add updatedAt if we're actually updating something
  if (Object.keys(campaignDb).length > 0) {
    campaignDb.updatedAt = new Date().toISOString();
  }
  
  const result = await db.update(Campaigns)
    .set(campaignDb)
    .where(and(
      eq(Campaigns.id, id),
      eq(Campaigns.userId, userId)
    ))
    .returning();
    
  if (result.length === 0) return null;
  
  const updated = result[0];
  // Convert string dates back to Date objects
  return {
    ...updated,
    createdAt: updated.createdAt ? new Date(updated.createdAt) : undefined,
    updatedAt: updated.updatedAt ? new Date(updated.updatedAt) : undefined,
    startDate: updated.startDate ? new Date(updated.startDate) : null,
    endDate: updated.endDate ? new Date(updated.endDate) : null,
  };
}

/**
 * Delete a campaign
 */
export async function deleteCampaign(id: string, userId: string) {
  const db = getDb();
  await db.delete(Campaigns)
    .where(and(
      eq(Campaigns.id, id),
      eq(Campaigns.userId, userId)
    ));
}
