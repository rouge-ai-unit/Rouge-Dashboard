/**
 * @file POST /api/cold-outreach/sync/notion
 * 
 * Sync contacts from Notion database
 * 
 * ## Request Body
 * ```json
 * {
 *   "credentials": {
 *     "token": "string",
 *     "databaseId": "string"
 *   },
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
 * - Efficient Notion API usage
 * - Batch database operations
 */

import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/apiAuth";
import { syncNotionContacts } from "@/lib/cold-outreach/crm/notion-service";
import { coldOutreachRateLimit, NotionCredentialsSchema, sanitizeCredentials } from "@/lib/cold-outreach/security-utils";

// POST /api/cold-outreach/sync/notion - Sync contacts from Notion
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const userId = session.user?.email || 'unknown';
    
    // Rate limiting
    const rateLimitCheck = coldOutreachRateLimit.check(`sync-notion-${userId}`);
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." }, 
        { status: 429 }
      );
    }
    
    const body = await req.json();
    const { credentials, campaignId } = body;
    
    // Validate credentials
    try {
      NotionCredentialsSchema.parse(credentials);
    } catch (error) {
      return NextResponse.json({ error: "Invalid Notion credentials" }, { status: 400 });
    }
    
    // Sanitize credentials for logging
    const sanitizedCreds = sanitizeCredentials(credentials);
    console.log("Syncing Notion contacts with sanitized credentials:", sanitizedCreds);
    
    // Sync contacts from Notion
    const syncedCount = await syncNotionContacts({
      userId,
      campaignId,
      credentials: {
        token: credentials.token,
        databaseId: credentials.databaseId
      }
    });
    
    return NextResponse.json({ 
      success: true, 
      count: syncedCount,
      message: `Successfully synced ${syncedCount} contacts from Notion`
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error syncing Notion contacts:", error);
    return NextResponse.json({ error: "Failed to sync Notion contacts" }, { status: 500 });
  }
}
