// ============================================================================
// CONTACT FINDER — TYPE DEFINITIONS
// Shared types for the Contact Finder feature
// ============================================================================

/**
 * Confidence level for extracted contact data.
 * - high:   email AND (linkedin OR phone) both found
 * - medium: linkedin OR phone found (not both)
 * - low:    name only, no verifiable contact found
 */
export type ConfidenceLevel = 'high' | 'medium' | 'low';

/**
 * A single extracted contact entity from Perplexity AI response.
 * This is the core data structure produced by the NLP entity extractor.
 */
export interface ContactEntity {
  name: string;
  title: string;
  email: string | null;
  phone: string | null;
  linkedin: string | null;
  instagram: string | null;
  facebook: string | null;
  twitter: string | null;
  source: string;
  confidence: ConfidenceLevel;
}

/**
 * A saved contact result from the database.
 */
export interface ContactFinderResult {
  id: string;
  searchId: string;
  name: string;
  title: string;
  email: string | null;
  phone: string | null;
  linkedin: string | null;
  instagram: string | null;
  facebook: string | null;
  twitter: string | null;
  source: string;
  confidence: ConfidenceLevel;
  createdAt: string;
}

/**
 * A saved search session from the database.
 */
export interface ContactFinderSearch {
  id: string;
  userId: string;
  company: string;
  role: string;
  country: string;
  rawResponse: string | null;
  citations: string[] | null;
  createdAt: string;
  contacts?: ContactFinderResult[];
}

// ============================================================================
// API Request / Response Types
// ============================================================================

/**
 * Request body for POST /api/contact-finder/search
 */
export interface SearchContactRequest {
  company: string;
  role: string;
  country: string;
}

/**
 * Response body for POST /api/contact-finder/search
 */
export interface SearchContactResponse {
  success: boolean;
  message?: string;
  searchId?: string;
  company?: string;
  role?: string;
  country?: string;
  contacts?: ContactFinderResult[];
  rawResponse?: string;
  citations?: string[];
  createdAt?: string;
}

/**
 * Response body for GET /api/contact-finder/history
 */
export interface GetHistoryResponse {
  success: boolean;
  message?: string;
  searches?: ContactFinderSearch[];
  total?: number;
}

/**
 * Response body for GET /api/contact-finder/history/[searchId]
 */
export interface GetSearchDetailResponse {
  success: boolean;
  message?: string;
  search?: ContactFinderSearch;
}

/**
 * Confidence badge color mapping for UI
 */
export const CONFIDENCE_COLORS: Record<ConfidenceLevel, string> = {
  high: 'bg-green-500/20 text-green-400 border-green-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  low: 'bg-red-500/20 text-red-400 border-red-500/30',
};
