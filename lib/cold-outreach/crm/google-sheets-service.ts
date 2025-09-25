/**
 * Google Sheets CRM Integration Service
 *
 * Enterprise-grade service for integrating with Google Sheets
 * for cold outreach contact management
 *
 * ## Features
 * - Google Sheets API integration
 * - Contact synchronization
 * - Custom field extraction
 * - Error handling and recovery
 *
 * ## Security
 * - Credential sanitization for logging
 * - Input validation and sanitization
 * - Email validation for all contacts
 * - OAuth2 secure authentication
 *
 * ## Performance
 * - Efficient API usage
 * - Batch processing where possible
 * - Error recovery for failed operations
 */

import { google } from 'googleapis';
import { getDb } from '@/utils/dbConfig';
import * as schema from '@/utils/schema';
import { and, eq } from 'drizzle-orm';
import { sanitizeInput, sanitizeCredentials, isValidEmail } from '@/lib/cold-outreach/security-utils';

export interface GoogleSheetContact {
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

export interface GoogleSheetsCredentials {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  redirectUri: string;
}

export interface GoogleSheetsSyncOptions {
  userId: string;
  campaignId?: string; // Changed to string to match UUID
  credentials: GoogleSheetsCredentials;
  spreadsheetId: string;
  range?: string;
}

/**
 * Get Google Sheets client
 * @param credentials Google Sheets API credentials
 * @returns Promise<SheetsClient> Google Sheets client
 */
async function getSheetsClient(credentials: GoogleSheetsCredentials) {
  const { clientId, clientSecret, refreshToken, redirectUri } = credentials;
  
  // Sanitize credentials for logging
  const sanitizedCreds = sanitizeCredentials(credentials);
  console.log("Creating Google Sheets client with sanitized credentials:", sanitizedCreds);
  
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Google Sheets credentials not configured');
  }
  
  const oAuth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  oAuth2Client.setCredentials({ refresh_token: refreshToken });
  return google.sheets({ version: 'v4', auth: oAuth2Client });
}

/**
 * Get contacts from Google Sheets
 * @param options Sync options including credentials and sheet info
 * @returns Promise<GoogleSheetContact[]> Array of contacts from Google Sheets
 */
export async function getGoogleSheetContacts(options: GoogleSheetsSyncOptions): Promise<GoogleSheetContact[]> {
  try {
    const { credentials, spreadsheetId, range = 'Sheet1!A1:F' } = options;
    
    // Sanitize inputs
    const sanitizedSpreadsheetId = sanitizeInput(spreadsheetId);
    const sanitizedRange = sanitizeInput(range);
    
    if (!sanitizedSpreadsheetId) {
      throw new Error('Spreadsheet ID is required');
    }
    
    const sheets = await getSheetsClient(credentials);
    const response: any = await sheets.spreadsheets.values.get({ 
      spreadsheetId: sanitizedSpreadsheetId, 
      range: sanitizedRange 
    });
    
    const rows = response.data.values;
    if (!rows || rows.length < 2) {
      return [];
    }
    
    const headers = rows[0];
    const contacts: GoogleSheetContact[] = rows.slice(1).map((row: string[]) => {
      const obj: Record<string, string> = {};
      headers.forEach((h: string, i: number) => { 
        obj[sanitizeInput(h.trim())] = sanitizeInput(row[i] || ''); 
      });
      
      return {
        name: sanitizeInput(obj['Full Name'] || ''),
        email: sanitizeInput(obj['Email'] || ''),
        company: sanitizeInput(obj['Company'] || ''),
        role: sanitizeInput(obj['Role'] || ''),
        status: sanitizeInput(obj['Status'] || ''),
        sentDate: sanitizeInput(obj['Sent Date'] || ''),
        followUpDate: sanitizeInput(obj['Follow-up Date'] || ''),
        notes: sanitizeInput(obj['Notes'] || ''),
        customFields: extractCustomFields(obj)
      };
    });
    
    return contacts;
  } catch (error) {
    console.error('Google Sheets error:', error);
    throw new Error('Failed to fetch Google Sheet contacts');
  }
}

/**
 * Sync contacts from Google Sheets to local database
 * @param options Sync options including credentials and sheet info
 * @returns Promise<number> Number of contacts synced
 */
export async function syncGoogleSheetContacts(options: GoogleSheetsSyncOptions): Promise<number> {
  try {
    const { userId, campaignId, credentials, spreadsheetId, range = 'Sheet1!A1:F' } = options;
    
    // Sanitize inputs
    const sanitizedUserId = sanitizeInput(userId);
    const sanitizedSpreadsheetId = sanitizeInput(spreadsheetId);
    const sanitizedRange = sanitizeInput(range);
    
    if (!sanitizedSpreadsheetId) {
      throw new Error('Spreadsheet ID is required');
    }
    
    const sheets = await getSheetsClient(credentials);
    const response: any = await sheets.spreadsheets.values.get({ 
      spreadsheetId: sanitizedSpreadsheetId, 
      range: sanitizedRange 
    });
    
    const rows = response.data.values;
    if (!rows || rows.length < 2) {
      return 0;
    }
    
    const headers = rows[0];
    const contacts = rows.slice(1).map((row: string[]) => {
      const obj: Record<string, string> = {};
      headers.forEach((h: string, i: number) => { 
        obj[sanitizeInput(h.trim())] = sanitizeInput(row[i] || ''); 
      });
      
      return {
        userId: sanitizedUserId,
        campaignId,
        name: sanitizeInput(obj['Full Name'] || ''),
        email: sanitizeInput(obj['Email'] || ''),
        company: sanitizeInput(obj['Company'] || ''),
        role: sanitizeInput(obj['Role'] || ''),
        status: sanitizeInput(obj['Status'] || ''),
        sentDate: sanitizeInput(obj['Sent Date'] || ''),
        followUpDate: sanitizeInput(obj['Follow-up Date'] || ''),
        notes: sanitizeInput(obj['Notes'] || ''),
        customFields: extractCustomFields(obj)
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
    console.error('Google Sheets sync error:', error);
    throw new Error('Failed to sync Google Sheet contacts');
  }
}

/**
 * Extract custom fields from Google Sheets row
 * @param row Google Sheets row object
 * @returns Record<string, any> Custom fields object
 */
function extractCustomFields(row: Record<string, string>): Record<string, any> {
  const customFields: Record<string, any> = {};
  
  // Define standard fields to exclude
  const standardFields = [
    'Full Name', 'Email', 'Company', 'Role', 'Status', 
    'Sent Date', 'Follow-up Date', 'Notes'
  ];
  
  // Extract all non-standard fields
  Object.entries(row).forEach(([key, value]) => {
    const sanitizedKey = sanitizeInput(key);
    if (!standardFields.includes(sanitizedKey)) {
      customFields[sanitizedKey] = sanitizeInput(value);
    }
  });
  
  return customFields;
}

// Export all functions as named exports instead of default export
// This fixes the ESLint warning: "Assign object to a variable before exporting as module default"
