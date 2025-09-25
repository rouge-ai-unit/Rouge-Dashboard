/**
 * Notion CRM Integration Service
 *
 * Enterprise-grade service for integrating with Notion databases
 * for cold outreach contact management
 *
 * ## Features
 * - Notion API integration
 * - Contact synchronization
 * - Custom field extraction
 * - Error handling and recovery
 *
 * ## Security
 * - Credential sanitization for logging
 * - Input validation and sanitization
 * - Email validation for all contacts
 * - Secure API token handling
 *
 * ## Performance
 * - Efficient API usage
 * - Batch processing where possible
 * - Error recovery for failed operations
 */

import { Client } from '@notionhq/client';
import { getDb } from '@/utils/dbConfig';
import * as schema from '@/utils/schema';
import { and, eq } from 'drizzle-orm';
import { sanitizeInput, sanitizeCredentials, isValidEmail } from '@/lib/cold-outreach/security-utils';

export interface NotionContact {
  notionId: string;
  name: string;
  email: string;
  company: string;
  role?: string;
  status?: string;
  sentDate?: string;
  followUpDate?: string;
  notes?: string;
  customFields?: Record<string, any>;
}

export interface NotionCredentials {
  token: string;
  databaseId: string;
}

export interface NotionSyncOptions {
  userId: string;
  campaignId?: string; // Changed to string to match UUID
  credentials: NotionCredentials;
}

/**
 * Get contacts from Notion database
 * @param credentials Notion API credentials
 * @returns Promise<NotionContact[]> Array of contacts from Notion
 */
export async function getNotionContacts(credentials: NotionCredentials): Promise<NotionContact[]> {
  try {
    const { token, databaseId } = credentials;
    
    // Sanitize credentials for logging
    const sanitizedCreds = sanitizeCredentials(credentials);
    console.log("Creating Notion client with sanitized credentials:", sanitizedCreds);
    
    if (!token || !databaseId) {
      throw new Error('Notion credentials not configured');
    }
    
    const notion = new Client({ auth: token });
    const response = await (notion.databases as any).query({
      database_id: databaseId
    });    
    const contacts: NotionContact[] = response.results.map((page: any) => {
      const props = page.properties;
      return {
        notionId: sanitizeInput(page.id),
        name: sanitizeInput(props['Full Name']?.title?.[0]?.plain_text || ''),
        email: sanitizeInput(props['Email']?.email || ''),
        company: sanitizeInput(props['Company']?.rich_text?.[0]?.plain_text || ''),
        role: sanitizeInput(props['Role']?.rich_text?.[0]?.plain_text || ''),
        status: sanitizeInput(props['Status']?.select?.name || ''),
        sentDate: sanitizeInput(props['Sent Date']?.date?.start || ''),
        followUpDate: sanitizeInput(props['Follow-up Date']?.date?.start || ''),
        notes: sanitizeInput(props['Notes']?.rich_text?.[0]?.plain_text || ''),
        customFields: extractCustomFields(props)
      };
    });
    
    return contacts;
  } catch (error) {
    console.error('Notion error:', error);
    throw new Error('Failed to fetch Notion contacts');
  }
}

/**
 * Sync contacts from Notion database to local database
 * @param options Sync options including credentials and user info
 * @returns Promise<number> Number of contacts synced
 */
export async function syncNotionContacts(options: NotionSyncOptions): Promise<number> {
  try {
    const { userId, campaignId, credentials } = options;
    const { token, databaseId } = credentials;
    
    // Sanitize inputs
    const sanitizedUserId = sanitizeInput(userId);
    const sanitizedDatabaseId = sanitizeInput(databaseId);
    
    if (!token || !sanitizedDatabaseId) {
      throw new Error('Notion credentials not configured');
    }
    
    const notion = new Client({ auth: token });
    // Cast to any to bypass TypeScript issues with the databases property
    const databases: any = notion.databases;
    const response: any = await databases.query({
      database_id: sanitizedDatabaseId
    });
    
    const contacts = response.results.map((page: any) => {
      const props = page.properties;
      return {
        userId: sanitizedUserId,
        campaignId,
        name: sanitizeInput(props['Full Name']?.title?.[0]?.plain_text || ''),
        email: sanitizeInput(props['Email']?.email || ''),
        company: sanitizeInput(props['Company']?.rich_text?.[0]?.plain_text || ''),
        role: sanitizeInput(props['Role']?.rich_text?.[0]?.plain_text || ''),
        status: sanitizeInput(props['Status']?.select?.name || ''),
        sentDate: sanitizeInput(props['Sent Date']?.date?.start || ''),
        followUpDate: sanitizeInput(props['Follow-up Date']?.date?.start || ''),
        notes: sanitizeInput(props['Notes']?.rich_text?.[0]?.plain_text || ''),
        customFields: extractCustomFields(props)
      };
    });
    
    const db = getDb();
    
    // Upsert contacts into local database
    let syncedCount = 0;
    for (const contact of contacts) {
      // Validate email before processing
      if (!contact.email || !isValidEmail(contact.email)) continue;
      
      try {
        // Check if contact already exists
        const existingContact = await db.select().from(schema.Contacts).where(
          and(
            eq(schema.Contacts.userId, sanitizedUserId),
            eq(schema.Contacts.email, contact.email)
          )
        ).limit(1);
        
        if (existingContact.length > 0) {
          // Update existing contact
          await db.update(schema.Contacts).set({
            name: contact.name,
            email: contact.email,
            role: contact.role || null,
            company: contact.company || null,
            userId: sanitizedUserId,
            updatedAt: new Date().toISOString()
          }).where(eq(schema.Contacts.id, existingContact[0].id));
        } else {
          // Insert new contact
          await db.insert(schema.Contacts).values({
            name: contact.name,
            email: contact.email,
            role: contact.role || null,
            company: contact.company || null,
            userId: sanitizedUserId,
          });
        }
        syncedCount++;
      } catch (error) {
        console.error(`Failed to sync contact ${contact.email}:`, error);
      }
    }
    
    return syncedCount;
  } catch (error) {
    console.error('Notion sync error:', error);
    throw new Error('Failed to sync Notion contacts');
  }
}

/**
 * Extract custom fields from Notion properties
 * @param properties Notion page properties
 * @returns Record<string, any> Custom fields object
 */
function extractCustomFields(properties: any): Record<string, any> {
  const customFields: Record<string, any> = {};
  
  // Define standard fields to exclude
  const standardFields = [
    'Full Name', 'Email', 'Company', 'Role', 'Status', 
    'Sent Date', 'Follow-up Date', 'Notes'
  ];
  
  // Extract all non-standard fields
  Object.entries(properties).forEach(([key, value]: [string, any]) => {
    const sanitizedKey = sanitizeInput(key);
    if (!standardFields.includes(sanitizedKey)) {
      customFields[sanitizedKey] = extractPropertyValue(value);
    }
  });
  
  return customFields;
}

/**
 * Extract value from Notion property
 * @param property Notion property object
 * @returns any Extracted value
 */
function extractPropertyValue(property: any): any {
  if (!property) return '';
  
  switch (property.type) {
    case 'title':
      return sanitizeInput(property.title?.[0]?.plain_text || '');
    case 'rich_text':
      return sanitizeInput(property.rich_text?.[0]?.plain_text || '');
    case 'email':
      return sanitizeInput(property.email || '');
    case 'url':
      return sanitizeInput(property.url || '');
    case 'number':
      return sanitizeInput(property.number?.toString() || '');
    case 'select':
      return sanitizeInput(property.select?.name || '');
    case 'multi_select':
      return property.multi_select?.map((item: any) => sanitizeInput(item.name)) || [];
    case 'date':
      return sanitizeInput(property.date?.start || '');
    case 'checkbox':
      return property.checkbox || false;
    case 'phone_number':
      return sanitizeInput(property.phone_number || '');
    default:
      return sanitizeInput('');
  }
}

// Export all functions as named exports instead of default export
// This fixes the ESLint warning: "Assign object to a variable before exporting as module default"
