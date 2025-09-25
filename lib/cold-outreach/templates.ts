import { getDb } from "@/utils/dbConfig";
import { Templates } from "@/utils/schema";
import { eq, and, sql } from "drizzle-orm";

export interface Template {
  id?: string;
  name: string;
  subject: string;
  content: string;
  category?: string;
  tags?: string[];
  userId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Database type with string dates
interface TemplateDb {
  id?: string;
  name: string;
  subject: string;
  content: string;
  userId: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Get all templates for a user
 */
export async function getTemplatesByUserId(userId: string, options?: {
  limit?: number;
  offset?: number;
  search?: string;
  category?: string;
  tags?: string[];
  performance?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  favoritesOnly?: boolean;
}) {
  const db = getDb();
  
  let whereConditions = [eq(Templates.userId, userId)];
  
  // Apply search filter
  if (options?.search) {
    whereConditions.push(sql`${Templates.name} ILIKE ${`%${options.search}%`} OR ${Templates.subject} ILIKE ${`%${options.search}%`} OR ${Templates.content} ILIKE ${`%${options.search}%`}`);
  }
  
  // Apply category filter
  if (options?.category) {
    whereConditions.push(eq(Templates.category, options.category));
  }

  // Apply tags filter
  if (options?.tags && options.tags.length > 0) {
    whereConditions.push(sql`${Templates.tags} @> ${JSON.stringify(options.tags)}`);
  }

  // Apply favorites filter
  if (options?.favoritesOnly) {
    whereConditions.push(eq(Templates.isFavorite, true));
  }

  // Apply performance filter
  if (options?.performance) {
    // Filter by performance metrics (high, medium, low based on open rates)
    const minRate = options.performance === 'high' ? 30 : options.performance === 'medium' ? 15 : 0;
    whereConditions.push(sql`${Templates.openRate} >= ${minRate}`);
  }
  
  // Build the base query
  const baseQuery = db.select().from(Templates).where(and(...whereConditions));

  // Apply ordering
  let orderedQuery;
  const sortOrder = options?.sortOrder === 'desc' ? sql`DESC` : sql`ASC`;

  switch (options?.sortBy) {
    case 'name':
      orderedQuery = baseQuery.orderBy(sql`${Templates.name} ${sortOrder}`);
      break;
    case 'created':
      orderedQuery = baseQuery.orderBy(sql`${Templates.createdAt} ${sortOrder}`);
      break;
    case 'usage':
      orderedQuery = baseQuery.orderBy(sql`${Templates.usageCount} ${sortOrder}`);
      break;
    case 'performance':
      orderedQuery = baseQuery.orderBy(sql`${Templates.openRate} ${sortOrder}`);
      break;
    case 'updated':
    default:
      orderedQuery = baseQuery.orderBy(sql`${Templates.updatedAt} ${sortOrder}`);
      break;
  }
  
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
  
  // Convert string dates back to Date objects
  return results.map((template: any) => ({
    ...template,
    createdAt: template.createdAt ? new Date(template.createdAt) : undefined,
    updatedAt: template.updatedAt ? new Date(template.updatedAt) : undefined,
  }));
}

/**
 * Get a template by ID and user ID
 */
export async function getTemplateById(id: string, userId: string) {
  const db = getDb();
  const result = await db.select().from(Templates).where(
    and(
      eq(Templates.id, id),
      eq(Templates.userId, userId)
    )
  );
  
  if (result.length === 0) return null;
  
  const template = result[0];
  // Convert string dates back to Date objects
  return {
    ...template,
    createdAt: template.createdAt ? new Date(template.createdAt) : undefined,
    updatedAt: template.updatedAt ? new Date(template.updatedAt) : undefined,
  };
}

/**
 * Create a new template
 */
export async function createTemplate(template: Omit<Template, 'id' | 'createdAt' | 'updatedAt'>) {
  const db = getDb();
  
  // Prepare data for database
  const templateDb: any = {
    name: template.name,
    subject: template.subject,
    content: template.content,
    category: template.category || 'General',
    tags: template.tags || [],
    userId: template.userId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  const result = await db.insert(Templates).values(templateDb).returning();
  
  if (result.length === 0) throw new Error("Failed to create template");
  
  const insertedTemplate = result[0];
  // Convert string dates back to Date objects
  return {
    ...insertedTemplate,
    createdAt: insertedTemplate.createdAt ? new Date(insertedTemplate.createdAt) : undefined,
    updatedAt: insertedTemplate.updatedAt ? new Date(insertedTemplate.updatedAt) : undefined,
  };
}

/**
 * Update a template
 */
export async function updateTemplate(id: string, userId: string, template: Partial<Template>) {
  const db = getDb();
  
  // Prepare data for database
  const templateDb: any = {};
  
  // Handle each property individually to ensure proper type conversion
  if (template.name !== undefined) templateDb.name = template.name;
  if (template.subject !== undefined) templateDb.subject = template.subject;
  if (template.content !== undefined) templateDb.content = template.content;
  if (template.category !== undefined) templateDb.category = template.category;
  if (template.tags !== undefined) templateDb.tags = template.tags;
  if (template.userId !== undefined) templateDb.userId = template.userId;
  
  // Only add updatedAt if we're actually updating something
  if (Object.keys(templateDb).length > 0) {
    templateDb.updatedAt = new Date().toISOString();
  }
  
  const result = await db.update(Templates)
    .set(templateDb)
    .where(and(
      eq(Templates.id, id),
      eq(Templates.userId, userId)
    ))
    .returning();
    
  if (result.length === 0) return null;
  
  const updated = result[0];
  // Convert string dates back to Date objects
  return {
    ...updated,
    createdAt: updated.createdAt ? new Date(updated.createdAt) : undefined,
    updatedAt: updated.updatedAt ? new Date(updated.updatedAt) : undefined,
  };
}

/**
 * Delete a template
 */
export async function deleteTemplate(id: string, userId: string) {
  const db = getDb();
  const result = await db.delete(Templates)
    .where(and(
      eq(Templates.id, id),
      eq(Templates.userId, userId)
    ));
  
  return (result.rowCount ?? 0) > 0;}
