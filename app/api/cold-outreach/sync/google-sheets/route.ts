/**
 * @file POST /api/cold-outreach/sync/google-sheets
 * 
 * Sync contacts from Google Sheets
 * 
 * ## Request Body
 * ```json
 * {
 *   "credentials": {
 *     "clientId": "string",
 *     "clientSecret": "string",
 *     "refreshToken": "string",
 *     "redirectUri": "string (optional)"
 *   },
 *   "spreadsheetId": "string",
 *   "range": "string (optional, default: 'Sheet1!A1:F')",
 *   "campaignId": "string (optional)"
 * }
 * ```
 * 
 * ## Response
 * ```json
 * {
 *   "success": true,
 *   "count": 0,
 *   "message": "string"
 * }
 * ```
 * 
 * ## Security
 * - Requires authentication
 * - Rate limited to 100 requests per minute per user
 * - Credential validation
 * - Input sanitization
 * - Sensitive credential removal from logs
 * 
 * ## Performance
 * - Efficient Google Sheets API usage
 * - Batch database operations
 */

import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/apiAuth";
import { syncGoogleSheetContacts } from "@/lib/cold-outreach/crm/google-sheets-service";
import { coldOutreachRateLimit, GoogleSheetsCredentialsSchema, sanitizeCredentials, sanitizeInput } from "@/lib/cold-outreach/security-utils";
import { logger } from "@/lib/client-utils";

// POST /api/cold-outreach/sync/google-sheets - Sync contacts from Google Sheets
export async function POST(req: NextRequest) {
  let userId = 'unknown';
  try {
    const session = await requireSession();
    userId = session.user?.id || 'unknown';    
    // Rate limiting
    const rateLimitCheck = coldOutreachRateLimit.check(`sync-google-sheets-${userId}`);
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." }, 
        { status: 429 }
      );
    }
    
    const body = await req.json();
    const { credentials, spreadsheetId, range, campaignId } = body;
    
    // Validate credentials
    try {
      GoogleSheetsCredentialsSchema.parse(credentials);
    } catch (error) {
      return NextResponse.json({ error: "Invalid Google Sheets credentials" }, { status: 400 });
    }
    
    if (!spreadsheetId) {
      return NextResponse.json({ error: "Spreadsheet ID is required" }, { status: 400 });
    }
    
    // Sanitize credentials for logging
    // Sanitize credentials for logging
    const sanitizedCreds = sanitizeCredentials(credentials);
   logger.info("Syncing Google Sheets contacts", {
     sanitizedCredentials: sanitizedCreds,
     spreadsheetId: sanitizeInput(spreadsheetId),
     userId: sanitizeInput(userId)
   });    
    // Sync contacts from Google Sheets
    const syncedCount = await syncGoogleSheetContacts({
      userId,
      campaignId,
      credentials: {
        clientId: credentials.clientId,
        clientSecret: credentials.clientSecret,
        refreshToken: credentials.refreshToken,
        redirectUri: credentials.redirectUri || process.env.GOOGLE_REDIRECT_URI || 'http://localhost'
      },
      spreadsheetId,
      range
    });
    
    return NextResponse.json({ 
      success: true, 
      count: syncedCount,
      message: `Successfully synced ${syncedCount} contacts from Google Sheets`
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    logger.error(
      "Error syncing Google Sheets contacts",
      error instanceof Error ? error : undefined,
      {
        userId: sanitizeInput(userId)
      }
    );    return NextResponse.json({ error: "Failed to sync Google Sheets contacts" }, { status: 500 });
  }
}
