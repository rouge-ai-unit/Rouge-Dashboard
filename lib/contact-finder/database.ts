// ============================================================================
// CONTACT FINDER — DATABASE HELPERS
// CRUD operations for contact finder searches and results
// ============================================================================

import { getDb } from '@/utils/dbConfig';
import { ContactFinderSearches, ContactFinderResults } from '@/utils/schema';
import { eq, desc } from 'drizzle-orm';
import { ContactEntity } from '@/types/contact-finder';

/**
 * Saves a new search session to the database.
 *
 * @param userId      - The authenticated user's ID/email
 * @param company     - Target company name
 * @param role        - Target role/title
 * @param country     - Target country
 * @param rawResponse - Raw text response from Perplexity AI
 * @param citations   - Citation URLs from Perplexity
 * @returns           - The created search record with its UUID
 */
export async function saveSearch(
  userId: string,
  company: string,
  role: string,
  country: string,
  rawResponse: string,
  citations: string[]
) {
  const db = getDb();
  const result = await db
    .insert(ContactFinderSearches)
    .values({
      userId,
      company,
      role,
      country,
      rawResponse,
      citations,
    })
    .returning();

  return result[0];
}

/**
 * Saves extracted contacts to the database, linked to a search session.
 *
 * @param searchId - UUID of the parent search session
 * @param contacts - Array of extracted ContactEntity objects
 * @returns        - Array of saved contact records
 */
export async function saveContacts(searchId: string, contacts: ContactEntity[]) {
  if (contacts.length === 0) return [];

  const db = getDb();
  const values = contacts.map((contact) => ({
    searchId,
    name: contact.name,
    title: contact.title,
    email: contact.email,
    phone: contact.phone,
    linkedin: contact.linkedin,
    instagram: contact.instagram,
    facebook: contact.facebook,
    twitter: contact.twitter,
    source: contact.source,
    confidence: contact.confidence,
  }));

  const result = await db
    .insert(ContactFinderResults)
    .values(values)
    .returning();

  return result;
}

/**
 * Fetches paginated search history for a user.
 *
 * @param userId - The authenticated user's ID/email
 * @param limit  - Maximum number of results to return (default 20)
 * @param offset - Number of results to skip (default 0)
 * @returns      - Array of search records with result counts
 */
export async function getSearchHistory(
  userId: string,
  limit: number = 20,
  offset: number = 0
) {
  const db = getDb();

  const searches = await db
    .select()
    .from(ContactFinderSearches)
    .where(eq(ContactFinderSearches.userId, userId))
    .orderBy(desc(ContactFinderSearches.createdAt))
    .limit(limit)
    .offset(offset);

  return searches;
}

/**
 * Fetches a specific search by ID, including all extracted contacts.
 *
 * @param searchId - UUID of the search session
 * @param userId   - The authenticated user's ID/email (for authorization)
 * @returns        - Search record with contacts, or null if not found
 */
export async function getSearchById(searchId: string, userId: string) {
  const db = getDb();

  const searches = await db
    .select()
    .from(ContactFinderSearches)
    .where(eq(ContactFinderSearches.id, searchId))
    .limit(1);

  if (searches.length === 0) return null;

  const search = searches[0];

  // Authorization check
  if (search.userId !== userId) return null;

  // Fetch associated contacts
  const contacts = await db
    .select()
    .from(ContactFinderResults)
    .where(eq(ContactFinderResults.searchId, searchId))
    .orderBy(desc(ContactFinderResults.createdAt));

  return {
    ...search,
    contacts,
  };
}

/**
 * Deletes a specific search and all associated contacts (CASCADE).
 *
 * @param searchId - UUID of the search session to delete
 * @param userId   - The authenticated user's ID/email (for authorization)
 * @returns        - true if deleted, false if not found or unauthorized
 */
export async function deleteSearch(searchId: string, userId: string): Promise<boolean> {
  const db = getDb();

  // Verify ownership
  const searches = await db
    .select()
    .from(ContactFinderSearches)
    .where(eq(ContactFinderSearches.id, searchId))
    .limit(1);

  if (searches.length === 0 || searches[0].userId !== userId) {
    return false;
  }

  // Delete (contacts are CASCADE deleted)
  await db
    .delete(ContactFinderSearches)
    .where(eq(ContactFinderSearches.id, searchId));

  return true;
}

/**
 * Deletes all search history for a user.
 *
 * @param userId - The authenticated user's ID/email
 * @returns      - Number of deleted searches
 */
export async function deleteAllSearches(userId: string): Promise<number> {
  const db = getDb();

  const deleted = await db
    .delete(ContactFinderSearches)
    .where(eq(ContactFinderSearches.userId, userId))
    .returning();

  return deleted.length;
}
