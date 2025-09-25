import { getDb } from "@/utils/dbConfig";
import { Contacts, Messages } from "@/utils/schema";
import { eq, and, sql, inArray } from "drizzle-orm";

export interface Contact {
  id?: string;
  name: string;
  email: string;
  role?: string | null;
  company?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  linkedinUrl?: string | null;
  website?: string | null;
  location?: string | null;
  notes?: string | null;
  industry?: string | null;
  companySize?: string | null;
  revenue?: string | null;
  linkedinProfile?: Record<string, unknown> | null;
  emailVerified?: boolean | null;
  emailValid?: boolean | null;
  status?: string | null;
  lifecycleStage?: string | null;
  engagementScore?: number | null;
  priorityScore?: number | null;
  leadScore?: number | null;
  totalEmailsSent?: number | null;
  totalOpens?: number | null;
  totalClicks?: number | null;
  totalReplies?: number | null;
  totalBounces?: number | null;
  lastContactedAt?: Date | null;
  lastRepliedAt?: Date | null;
  lastOpenedAt?: Date | null;
  segments?: string[] | null;
  tags?: string[] | null;
  customFields?: Record<string, unknown> | null;
  source?: string | null;
  sourceDetails?: Record<string, unknown> | null;
  userId: string;
  createdAt?: Date;
  updatedAt?: Date;
  campaignCount?: number;
  lastContacted?: Date | null;
}

type CampaignStats = { campaignCount: number; lastContacted: Date | null };

async function fetchCampaignStats(db: any, contactIds: string[]): Promise<Map<string, CampaignStats>> {
  const statsMap = new Map<string, CampaignStats>();

  if (!contactIds.length) {
    return statsMap;
  }

  const stats = await db
    .select({
      contactId: Messages.contactId,
      campaignCount: sql<number>`COUNT(DISTINCT ${Messages.campaignId})`,
      lastActivity: sql<string | null>`MAX(${Messages.sentAt})`,
    })
    .from(Messages)
    .where(inArray(Messages.contactId, contactIds))
    .groupBy(Messages.contactId);

  for (const stat of stats) {
    if (!stat.contactId) continue;
    const lastContacted = stat.lastActivity ? new Date(stat.lastActivity) : null;
    statsMap.set(stat.contactId, {
      campaignCount: Number(stat.campaignCount) || 0,
      lastContacted,
    });
  }

  return statsMap;
}

function normalizeContact(contact: any, stats?: CampaignStats): Contact {
  const segments = Array.isArray(contact.segments) ? contact.segments : [];
  const tags = Array.isArray(contact.tags) ? contact.tags : [];
  const customFields = contact.customFields && typeof contact.customFields === "object" ? contact.customFields : {};
  const linkedinProfile = contact.linkedinProfile && typeof contact.linkedinProfile === "object" ? contact.linkedinProfile : null;
  const sourceDetails = contact.sourceDetails && typeof contact.sourceDetails === "object" ? contact.sourceDetails : {};

  const createdAt = contact.createdAt ? new Date(contact.createdAt) : undefined;
  const updatedAt = contact.updatedAt ? new Date(contact.updatedAt) : undefined;
  const lastContactedAt = contact.lastContactedAt ? new Date(contact.lastContactedAt) : null;
  const lastRepliedAt = contact.lastRepliedAt ? new Date(contact.lastRepliedAt) : null;
  const lastOpenedAt = contact.lastOpenedAt ? new Date(contact.lastOpenedAt) : null;

  return {
    id: contact.id,
    name: contact.name || `${contact.firstName ?? ""} ${contact.lastName ?? ""}`.trim(),
    email: contact.email,
    role: contact.role ?? null,
    company: contact.company ?? null,
    firstName: contact.firstName ?? null,
    lastName: contact.lastName ?? null,
    phone: contact.phone ?? null,
    linkedinUrl: contact.linkedinUrl ?? null,
    website: contact.website ?? null,
    location: contact.location ?? null,
    notes: contact.notes ?? null,
    industry: contact.industry ?? null,
    companySize: contact.companySize ?? null,
    revenue: contact.revenue ?? null,
    linkedinProfile,
    emailVerified: contact.emailVerified ?? false,
    emailValid: contact.emailValid ?? true,
    status: contact.status ?? "active",
    lifecycleStage: contact.lifecycleStage ?? "prospect",
    engagementScore: contact.engagementScore ?? 0,
    priorityScore: contact.priorityScore ?? null,
    leadScore: contact.leadScore ?? null,
    totalEmailsSent: typeof contact.totalEmailsSent === "number" ? contact.totalEmailsSent : Number(contact.totalEmailsSent ?? 0),
    totalOpens: typeof contact.totalOpens === "number" ? contact.totalOpens : Number(contact.totalOpens ?? 0),
    totalClicks: typeof contact.totalClicks === "number" ? contact.totalClicks : Number(contact.totalClicks ?? 0),
    totalReplies: typeof contact.totalReplies === "number" ? contact.totalReplies : Number(contact.totalReplies ?? 0),
    totalBounces: typeof contact.totalBounces === "number" ? contact.totalBounces : Number(contact.totalBounces ?? 0),
    lastContactedAt,
    lastRepliedAt,
    lastOpenedAt,
    segments,
    tags,
    customFields,
  source: contact.source ?? null,
  sourceDetails,
    userId: contact.userId,
    createdAt,
    updatedAt,
    campaignCount: stats?.campaignCount ?? 0,
    lastContacted: stats?.lastContacted ?? lastContactedAt,
  };
}

/**
 * Get all contacts for a user
 */
export async function getContactsByUserId(userId: string, options?: {
  limit?: number;
  offset?: number;
  search?: string;
  campaignId?: string;
}) {
  const db = getDb();
  
  let whereConditions = [eq(Contacts.userId, userId)];
  
  // Apply search filter
  if (options?.search) {
    whereConditions.push(sql`${Contacts.name} ILIKE ${`%${options.search}%`} OR ${Contacts.email} ILIKE ${`%${options.search}%`}`);
  }
  
  // Apply campaign filter if provided
  if (options?.campaignId) {
    // This would require a join with messages table to find contacts associated with a campaign
    // For now, we'll skip this filter
  }
  
  // Build the base query
  const baseQuery = db.select().from(Contacts).where(and(...whereConditions));
  
  // Apply ordering
  const orderedQuery = baseQuery.orderBy(Contacts.createdAt);
  
  // Apply pagination based on options
  let finalQuery;
  if (options?.limit && options?.offset) {
    finalQuery = orderedQuery.limit(options.limit).offset(options.offset);
  } else if (options?.limit) {
    finalQuery = orderedQuery.limit(options.limit);
  } else if (options?.offset) {
    finalQuery = orderedQuery.offset(options.offset);
  } else {
    finalQuery = orderedQuery;
  }
  
  const results = await finalQuery;

  const contactIds = results
    .map((contact: any) => contact.id)
    .filter((id: unknown): id is string => typeof id === "string" && id.length > 0);

  const campaignStats = await fetchCampaignStats(db, contactIds);

  return results.map((contact: any) => normalizeContact(contact, contact.id ? campaignStats.get(contact.id) : undefined));
}

/**
 * Get a contact by ID and user ID
 */
export async function getContactById(id: string, userId: string) {
  const db = getDb();
  const result = await db.select().from(Contacts).where(
    and(
      eq(Contacts.id, id),
      eq(Contacts.userId, userId)
    )
  );
  
  if (result.length === 0) return null;
  
  const contact = result[0];
  const stats = await fetchCampaignStats(db, contact.id ? [contact.id] : []);
  return normalizeContact(contact, contact.id ? stats.get(contact.id) : undefined);
}

/**
 * Create a new contact
 */
export async function createContact(contact: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>) {
  const db = getDb();
  
  // Prepare data for database
  const contactDb: any = {
    name: contact.name,
    email: contact.email,
    role: contact.role,
    company: contact.company,
    firstName: contact.firstName,
    lastName: contact.lastName,
    phone: contact.phone,
    linkedinUrl: contact.linkedinUrl,
    website: contact.website,
    location: contact.location,
    notes: contact.notes,
    industry: contact.industry,
    companySize: contact.companySize,
    revenue: contact.revenue,
    linkedinProfile: contact.linkedinProfile,
    emailVerified: contact.emailVerified ?? false,
    emailValid: contact.emailValid ?? true,
    status: contact.status ?? "active",
    lifecycleStage: contact.lifecycleStage ?? "prospect",
    engagementScore: contact.engagementScore ?? 0,
    priorityScore: contact.priorityScore,
    leadScore: contact.leadScore,
    totalEmailsSent: contact.totalEmailsSent ?? 0,
    totalOpens: contact.totalOpens ?? 0,
    totalClicks: contact.totalClicks ?? 0,
    totalReplies: contact.totalReplies ?? 0,
    totalBounces: contact.totalBounces ?? 0,
    lastContactedAt: contact.lastContactedAt ?? null,
    lastRepliedAt: contact.lastRepliedAt ?? null,
    lastOpenedAt: contact.lastOpenedAt ?? null,
    segments: contact.segments ?? [],
    tags: contact.tags ?? [],
    customFields: contact.customFields ?? {},
    source: contact.source,
    sourceDetails: contact.sourceDetails ?? {},
    userId: contact.userId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  const result = await db.insert(Contacts).values(contactDb).returning();
  
  if (result.length === 0) throw new Error("Failed to create contact");
  
  const insertedContact = result[0];
  return normalizeContact(insertedContact, {
    campaignCount: 0,
    lastContacted: insertedContact.lastContactedAt ? new Date(insertedContact.lastContactedAt) : null,
  });
}

/**
 * Update a contact
 */
export async function updateContact(id: string, userId: string, contact: Partial<Contact>) {
  const db = getDb();
  
  // Prepare data for database
  const contactDb: any = {};
  
  // Handle each property individually to ensure proper type conversion
  if (contact.name !== undefined) contactDb.name = contact.name;
  if (contact.email !== undefined) contactDb.email = contact.email;
  if (contact.role !== undefined) contactDb.role = contact.role;
  if (contact.company !== undefined) contactDb.company = contact.company;
  if (contact.firstName !== undefined) contactDb.firstName = contact.firstName;
  if (contact.lastName !== undefined) contactDb.lastName = contact.lastName;
  if (contact.phone !== undefined) contactDb.phone = contact.phone;
  if (contact.linkedinUrl !== undefined) contactDb.linkedinUrl = contact.linkedinUrl;
  if (contact.website !== undefined) contactDb.website = contact.website;
  if (contact.location !== undefined) contactDb.location = contact.location;
  if (contact.notes !== undefined) contactDb.notes = contact.notes;
  if (contact.industry !== undefined) contactDb.industry = contact.industry;
  if (contact.companySize !== undefined) contactDb.companySize = contact.companySize;
  if (contact.revenue !== undefined) contactDb.revenue = contact.revenue;
  if (contact.linkedinProfile !== undefined) contactDb.linkedinProfile = contact.linkedinProfile;
  if (contact.emailVerified !== undefined) contactDb.emailVerified = contact.emailVerified;
  if (contact.emailValid !== undefined) contactDb.emailValid = contact.emailValid;
  if (contact.status !== undefined) contactDb.status = contact.status;
  if (contact.lifecycleStage !== undefined) contactDb.lifecycleStage = contact.lifecycleStage;
  if (contact.engagementScore !== undefined) contactDb.engagementScore = contact.engagementScore;
  if (contact.priorityScore !== undefined) contactDb.priorityScore = contact.priorityScore;
  if (contact.leadScore !== undefined) contactDb.leadScore = contact.leadScore;
  if (contact.totalEmailsSent !== undefined) contactDb.totalEmailsSent = contact.totalEmailsSent;
  if (contact.totalOpens !== undefined) contactDb.totalOpens = contact.totalOpens;
  if (contact.totalClicks !== undefined) contactDb.totalClicks = contact.totalClicks;
  if (contact.totalReplies !== undefined) contactDb.totalReplies = contact.totalReplies;
  if (contact.totalBounces !== undefined) contactDb.totalBounces = contact.totalBounces;
  if (contact.lastContactedAt !== undefined) contactDb.lastContactedAt = contact.lastContactedAt;
  if (contact.lastRepliedAt !== undefined) contactDb.lastRepliedAt = contact.lastRepliedAt;
  if (contact.lastOpenedAt !== undefined) contactDb.lastOpenedAt = contact.lastOpenedAt;
  if (contact.segments !== undefined) contactDb.segments = contact.segments;
  if (contact.tags !== undefined) contactDb.tags = contact.tags;
  if (contact.customFields !== undefined) contactDb.customFields = contact.customFields;
  if (contact.source !== undefined) contactDb.source = contact.source;
  if (contact.sourceDetails !== undefined) contactDb.sourceDetails = contact.sourceDetails;
  if (contact.userId !== undefined) contactDb.userId = contact.userId;
  
  // Only add updatedAt if we're actually updating something
  if (Object.keys(contactDb).length > 0) {
    contactDb.updatedAt = new Date().toISOString();
  }
  
  const result = await db.update(Contacts)
    .set(contactDb)
    .where(and(
      eq(Contacts.id, id),
      eq(Contacts.userId, userId)
    ))
    .returning();
    
  if (result.length === 0) return null;
  
  const updated = result[0];
  const stats = await fetchCampaignStats(db, [id]);
  return normalizeContact(updated, stats.get(id));
}

/**
 * Delete a contact
 */
export async function deleteContact(id: string, userId: string) {
  const db = getDb();
  const result = await db.delete(Contacts)
    .where(and(
      eq(Contacts.id, id),
      eq(Contacts.userId, userId)
    ));
  
  return result.rowCount > 0;
}

/**
 * Delete multiple contacts
 */
export async function deleteContacts(ids: string[], userId: string) {
  const db = getDb();
  
  // Delete one by one for now
  for (const id of ids) {
    await db.delete(Contacts)
      .where(and(
        eq(Contacts.id, id),
        eq(Contacts.userId, userId)
      ));
  }
}

/**
 * Get contact metrics for a user
 */
export async function getContactMetrics(userId: string) {
  const db = getDb();

  // Get total contacts count
  const totalContactsResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(Contacts)
    .where(eq(Contacts.userId, userId));

  const totalContacts = totalContactsResult[0]?.count || 0;

  // Get active contacts (contacts with recent activity - we'll consider contacts created in last 30 days as active)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const activeContactsResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(Contacts)
    .where(and(
      eq(Contacts.userId, userId),
      sql`${Contacts.createdAt} >= ${thirtyDaysAgo}`
    ));

  const activeContacts = activeContactsResult[0]?.count || 0;

  // For now, we'll set qualified contacts to 0 since we don't have a qualification system yet
  // This can be enhanced later with actual qualification logic
  const qualifiedContacts = 0;

  // Calculate average engagement score (placeholder - would need engagement tracking)
  const avgEngagementScore = 0;

  // Get recent additions (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const recentAdditionsResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(Contacts)
    .where(and(
      eq(Contacts.userId, userId),
      sql`${Contacts.createdAt} >= ${sevenDaysAgo}`
    ));

  const recentAdditions = recentAdditionsResult[0]?.count || 0;

  // Get top companies
  const topCompaniesResult = await db
    .select({
      company: Contacts.company,
      count: sql<number>`count(*)`
    })
    .from(Contacts)
    .where(and(
      eq(Contacts.userId, userId),
      sql`${Contacts.company} IS NOT NULL`
    ))
    .groupBy(Contacts.company)
    .orderBy(sql`count(*) DESC`)
    .limit(5);

  const topCompanies = topCompaniesResult
    .filter(row => row.company)
    .map(row => ({
      name: row.company!,
      count: row.count
    }));

  return {
    totalContacts,
    activeContacts,
    qualifiedContacts,
    avgEngagementScore,
    recentAdditions,
    topCompanies
  };
}
