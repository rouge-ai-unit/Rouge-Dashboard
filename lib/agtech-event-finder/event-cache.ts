import type { AgTechEvent, AgTechEventCacheEntry } from "@/types/agtech-event-finder";

/**
 * Event Cache Service
 * Simple in-memory cache for AgTech event search results
 * Reduces API calls and improves performance for repeated searches
 */

// Cache storage
const cache = new Map<string, AgTechEventCacheEntry>();

// Default TTL: 1 hour (in milliseconds)
const DEFAULT_TTL = 60 * 60 * 1000;

/**
 * Generate a cache key from a location string
 * Normalizes the location to ensure consistent caching
 * 
 * @param location - The location string to generate a key for
 * @returns Normalized cache key
 */
export function generateCacheKey(location: string): string {
  return location.toLowerCase().trim().replace(/\s+/g, '-');
}

/**
 * Get cached events for a location
 * Returns null if cache miss or expired
 * 
 * @param location - The location to retrieve cached events for
 * @returns Cached events or null
 */
export function getCachedEvents(location: string): AgTechEvent[] | null {
  const key = generateCacheKey(location);
  const entry = cache.get(key);

  if (!entry) {
    return null;
  }

  // Check if cache entry has expired
  const now = Date.now();
  if (now - entry.cachedAt > entry.ttl) {
    // Cache expired, remove it
    cache.delete(key);
    console.log(`[AgTech Cache] Cache expired for location: ${location}`);
    return null;
  }

  console.log(`[AgTech Cache] Cache hit for location: ${location}`);
  return entry.events;
}

/**
 * Cache events for a location
 * 
 * @param location - The location to cache events for
 * @param events - The events to cache
 * @param ttl - Time-to-live in milliseconds (optional, defaults to 1 hour)
 */
export function setCachedEvents(
  location: string,
  events: AgTechEvent[],
  ttl: number = DEFAULT_TTL
): void {
  const key = generateCacheKey(location);
  const entry: AgTechEventCacheEntry = {
    events,
    location,
    cachedAt: Date.now(),
    ttl,
  };

  cache.set(key, entry);
  console.log(`[AgTech Cache] Cached ${events.length} events for location: ${location}`);
}

/**
 * Clear all cached events
 */
export function clearCache(): void {
  cache.clear();
  console.log('[AgTech Cache] Cache cleared');
}

/**
 * Clear all cache on module load to ensure fresh data
 * This is useful when the prompt or logic changes
 */
if (typeof window === 'undefined') {
  // Server-side only - clear cache on startup
  cache.clear();
}

/**
 * Clear cached events for a specific location
 * 
 * @param location - The location to clear cache for
 */
export function clearCacheForLocation(location: string): void {
  const key = generateCacheKey(location);
  cache.delete(key);
  console.log(`[AgTech Cache] Cache cleared for location: ${location}`);
}

/**
 * Get cache statistics
 * 
 * @returns Object with cache size and keys
 */
export function getCacheStats(): { size: number; keys: string[] } {
  return {
    size: cache.size,
    keys: Array.from(cache.keys()),
  };
}
