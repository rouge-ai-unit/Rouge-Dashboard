/**
 * AgTech Event Finder Type Definitions
 * Types for the AgTech Event Finder feature
 */

/**
 * Represents an AgTech event with all relevant details
 */
export interface AgTechEvent {
  /** Official name of the event */
  eventName: string;
  /** Date or date range of the event (e.g., 'October 26-28, 2024') */
  date: string;
  /** City and state/country of the event (e.g., 'San Francisco, CA') */
  location: string;
  /** Brief summary of the event's focus */
  description: string;
  /** Cost to attend, or 'Free' if there is no cost */
  price: string;
  /** Direct URL to the event's registration page */
  registrationLink: string;
}

/**
 * Request body for searching AgTech events
 */
export interface AgTechEventSearchRequest {
  /** Location to search for events (city, state, or coordinates) */
  location: string;
}

/**
 * Response from the AgTech events API
 */
export interface AgTechEventSearchResponse {
  /** Array of found events */
  events: AgTechEvent[];
  /** Location that was searched */
  searchedLocation: string;
  /** Timestamp of the search */
  timestamp: string;
}

/**
 * Error response from the AgTech events API
 */
export interface AgTechEventError {
  /** Error message */
  error: string;
  /** Error code */
  code?: string;
  /** Additional error details */
  details?: string;
}

/**
 * Search history entry for user's past searches
 */
export interface AgTechEventSearchHistory {
  /** Unique identifier for the search */
  id: string;
  /** User ID who performed the search */
  userId: string;
  /** Location that was searched */
  location: string;
  /** Number of results found */
  resultsCount: number;
  /** Timestamp of the search */
  timestamp: Date;
}

/**
 * Cache entry for storing search results
 */
export interface AgTechEventCacheEntry {
  /** Cached events */
  events: AgTechEvent[];
  /** Location that was searched */
  location: string;
  /** Timestamp when cached */
  cachedAt: number;
  /** Time-to-live in milliseconds */
  ttl: number;
}
