import { getDb } from "@/utils/dbConfig";
import { Messages } from "@/utils/schema";
import { eq, and } from "drizzle-orm";

export interface Message {
  id?: string;
  campaignId: string;
  contactId: string;
  subject: string;
  content: string;
  status: string;
  sentAt?: Date | null;
  userId: string;
  createdAt?: Date;
}

// Database type with string dates
interface MessageDb {
  id?: string;
  campaignId: string;
  contactId: string;
  subject: string;
  content: string;
  status: string;
  sentAt?: string | null;
  userId: string;
  createdAt?: string;
}

/**
 * Get all messages for a user
 */
export async function getMessagesByUserId(userId: string) {
  const db = getDb();
  const results = await db.select().from(Messages).where(eq(Messages.userId, userId));
  
  // Convert string dates back to Date objects
  return results.map(message => ({
    ...message,
    sentAt: message.sentAt ? new Date(message.sentAt) : null,
    createdAt: message.createdAt ? new Date(message.createdAt) : undefined,
  }));
}

/**
 * Get messages by campaign ID
 */
export async function getMessagesByCampaignId(campaignId: string, userId: string) {
  const db = getDb();
  const results = await db.select().from(Messages).where(
    and(
      eq(Messages.campaignId, campaignId),
      eq(Messages.userId, userId)
    )
  );
  
  // Convert string dates back to Date objects
  return results.map(message => ({
    ...message,
    sentAt: message.sentAt ? new Date(message.sentAt) : null,
    createdAt: message.createdAt ? new Date(message.createdAt) : undefined,
  }));
}

/**
 * Get a message by ID and user ID
 */
export async function getMessageById(id: string, userId: string) {
  const db = getDb();
  const result = await db.select().from(Messages).where(
    and(
      eq(Messages.id, id),
      eq(Messages.userId, userId)
    )
  );
  
  if (result.length === 0) return null;
  
  const message = result[0];
  // Convert string dates back to Date objects
  return {
    ...message,
    sentAt: message.sentAt ? new Date(message.sentAt) : null,
    createdAt: message.createdAt ? new Date(message.createdAt) : undefined,
  };
}

/**
 * Create a new message
 */
export async function createMessage(message: Omit<Message, 'id' | 'createdAt'>) {
  const db = getDb();
  
  // Prepare data for database
  const messageDb: any = {
    campaignId: message.campaignId,
    contactId: message.contactId,
    subject: message.subject,
    content: message.content,
    status: message.status,
    userId: message.userId,
  };
  
  // Handle date conversions
  if (message.sentAt instanceof Date) {
    messageDb.sentAt = message.sentAt.toISOString();
  } else if (message.sentAt !== undefined) {
    messageDb.sentAt = message.sentAt;
  }
  
  messageDb.createdAt = new Date().toISOString();
  
  const result = await db.insert(Messages).values(messageDb).returning();
  
  if (result.length === 0) throw new Error("Failed to create message");
  
  const insertedMessage = result[0];
  // Convert string dates back to Date objects
  return {
    ...insertedMessage,
    sentAt: insertedMessage.sentAt ? new Date(insertedMessage.sentAt) : null,
    createdAt: insertedMessage.createdAt ? new Date(insertedMessage.createdAt) : undefined,
  };
}

/**
 * Update a message
 */
export async function updateMessage(id: string, userId: string, message: Partial<Message>) {
  const db = getDb();
  
  // Prepare data for database
  const messageDb: Record<string, any> = {};
  
  // Handle each property individually to ensure proper type conversion
  if (message.campaignId !== undefined) messageDb.campaignId = message.campaignId;
  if (message.contactId !== undefined) messageDb.contactId = message.contactId;
  if (message.subject !== undefined) messageDb.subject = message.subject;
  if (message.content !== undefined) messageDb.content = message.content;
  if (message.status !== undefined) messageDb.status = message.status;
  if (message.userId !== undefined) messageDb.userId = message.userId;  
  // Handle date conversions
  if (message.sentAt instanceof Date) {
    messageDb.sentAt = message.sentAt.toISOString();
  } else if (message.sentAt !== undefined) {
    messageDb.sentAt = message.sentAt;
  }
  
  const result = await db.update(Messages)
    .set(messageDb)
    .where(and(
      eq(Messages.id, id),
      eq(Messages.userId, userId)
    ))
    .returning();
    
  if (result.length === 0) return null;
  
  const updated = result[0];
  // Convert string dates back to Date objects
  return {
    ...updated,
    sentAt: updated.sentAt ? new Date(updated.sentAt) : null,
    createdAt: updated.createdAt ? new Date(updated.createdAt) : undefined,
  };
}

/**
 * Delete a message
 */
export async function deleteMessage(id: string, userId: string) {
  const db = getDb();
  await db.delete(Messages)
    .where(and(
      eq(Messages.id, id),
      eq(Messages.userId, userId)
    ));
}
