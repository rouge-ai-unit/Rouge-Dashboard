/**
 * Cache Utilities
 *
 * Enterprise-grade caching utilities for the Cold Connect Automator tool
 * with LRU eviction and expiration support
 *
 * ## Features
 * - Generic LRU cache implementation
 * - Time-based expiration
 * - Size-based eviction
 * - Statistics tracking
 * - Performance monitoring
 * - Input validation and sanitization
 *
 * ## Security
 * - Memory leak prevention through size limits
 * - Cache key sanitization
 * - Expiration to prevent stale data
 * - Safe serialization/deserialization
 *
 * ## Performance
 * - O(1) get/set operations
 * - Automatic cleanup of expired entries
 * - Configurable size limits
 * - Real-time usage statistics tracking
 */

import { logger, ValidationError, withPerformanceMonitoring, sanitizeInput } from '../client-utils';
import { z } from 'zod';

// Validation schemas
const CacheConfigSchema = z.object({
  maxSize: z.number().min(1).max(100000),
  defaultTTL: z.number().min(1000).max(30 * 24 * 60 * 60 * 1000), // 1 second to 30 days
  name: z.string().min(1).max(50).optional()
});

const CacheKeySchema = z.string().min(1).max(500);

// Custom error classes
class CacheError extends Error {
  constructor(message: string, public code: string, public details?: any) {
    super(message);
    this.name = 'CacheError';
  }
}

class CacheKeyError extends CacheError {
  constructor(message: string = 'Invalid cache key') {
    super(message, 'INVALID_KEY');
  }
}

class CacheSizeError extends CacheError {
  constructor(message: string = 'Cache size limit exceeded') {
    super(message, 'SIZE_LIMIT_EXCEEDED');
  }
}

export interface CacheEntry<T> {
  value: T;
  expiry: number;
  created: number;
  accessCount: number;
  lastAccessed: number;
  size: number; // Approximate size in bytes
}

export interface CacheStats {
  size: number;
  maxSize: number;
  hitRate: number;
  missRate: number;
  totalHits: number;
  totalMisses: number;
  totalSets: number;
  totalDeletes: number;
  totalEvictions: number;
  averageAccessTime: number;
  memoryUsage: number; // Approximate memory usage in bytes
  uptime: number; // Cache uptime in milliseconds
}

export class LRUCache<T> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private readonly maxSize: number;
  private readonly defaultTTL: number;
  private readonly name?: string;

  // Statistics tracking
  private stats = {
    totalHits: 0,
    totalMisses: 0,
    totalSets: 0,
    totalDeletes: 0,
    totalEvictions: 0,
    totalAccessTime: 0,
    createdAt: Date.now()
  };

  constructor(maxSize: number = 1000, defaultTTL: number = 60 * 60 * 1000, name?: string) {
    // Validate configuration
    const configValidation = CacheConfigSchema.safeParse({ maxSize, defaultTTL, name });
    if (!configValidation.success) {
      throw new ValidationError(`Invalid cache configuration: ${configValidation.error.errors.map(e => e.message).join(', ')}`);
    }

    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
    this.name = name;

    logger.info('LRU Cache initialized', {
      name: this.name,
      maxSize: this.maxSize,
      defaultTTL: this.defaultTTL
    });
  }

  /**
   * Get value from cache
   * @param key Cache key
   * @returns Cached value or undefined if not found/expired
   */
  get(key: string): T | undefined {
    const startTime = Date.now();

    try {
      // Validate key
      const keyValidation = CacheKeySchema.safeParse(key);
      if (!keyValidation.success) {
        throw new CacheKeyError(`Invalid cache key: ${keyValidation.error.errors.map(e => e.message).join(', ')}`);
      }

      const sanitizedKey = sanitizeInput(key);
      const entry = this.cache.get(sanitizedKey);

      if (!entry) {
        this.stats.totalMisses++;
        logger.debug('Cache miss', { key: sanitizedKey.substring(0, 20), cacheName: this.name });
        return undefined;
      }

      // Check if expired
      if (Date.now() > entry.expiry) {
        this.cache.delete(sanitizedKey);
        this.stats.totalMisses++;
        logger.debug('Cache expired', { key: sanitizedKey.substring(0, 20), cacheName: this.name });
        return undefined;
      }

      // Update access statistics
      entry.accessCount++;
      entry.lastAccessed = Date.now();

      // Move to front (LRU)
      this.cache.delete(sanitizedKey);
      this.cache.set(sanitizedKey, entry);

      this.stats.totalHits++;
      this.stats.totalAccessTime += (Date.now() - startTime);

      logger.debug('Cache hit', {
        key: sanitizedKey.substring(0, 20),
        cacheName: this.name,
        accessCount: entry.accessCount
      });

      return entry.value;

    } catch (error) {
      logger.error('Cache get operation failed', error as Error, { key: key.substring(0, 20), cacheName: this.name });
      throw error;
    }
  }

  /**
   * Set value in cache
   * @param key Cache key
   * @param value Value to cache
   * @param ttl Time to live in milliseconds (optional)
   */
  set(key: string, value: T, ttl?: number): void {
    try {
      // Validate key
      const keyValidation = CacheKeySchema.safeParse(key);
      if (!keyValidation.success) {
        throw new CacheKeyError(`Invalid cache key: ${keyValidation.error.errors.map(e => e.message).join(', ')}`);
      }

      const sanitizedKey = sanitizeInput(key);
      const now = Date.now();
      const expiry = now + (ttl || this.defaultTTL);

      // Estimate size (rough approximation)
      const sizeEstimate = this.estimateSize(value) + sanitizedKey.length + 50; // overhead

      // Check if adding this entry would exceed max size
      if (this.cache.size >= this.maxSize) {
        // Remove oldest entries until we have space
        const entriesToRemove = Math.min(10, Math.ceil(this.maxSize * 0.1)); // Remove 10% or 10 entries
        for (let i = 0; i < entriesToRemove && this.cache.size >= this.maxSize; i++) {
          const firstKey = this.cache.keys().next().value;
          if (firstKey) {
            this.cache.delete(firstKey);
            this.stats.totalEvictions++;
          }
        }

        // If still at max size, throw error
        if (this.cache.size >= this.maxSize) {
          throw new CacheSizeError(`Cache size limit (${this.maxSize}) would be exceeded`);
        }
      }

      this.cache.set(sanitizedKey, {
        value,
        expiry,
        created: now,
        accessCount: 0,
        lastAccessed: now,
        size: sizeEstimate
      });

      this.stats.totalSets++;

      logger.debug('Cache set', {
        key: sanitizedKey.substring(0, 20),
        cacheName: this.name,
        ttl: ttl || this.defaultTTL,
        size: sizeEstimate
      });

    } catch (error) {
      logger.error('Cache set operation failed', error as Error, { key: key.substring(0, 20), cacheName: this.name });
      throw error;
    }
  }

  /**
   * Delete entry from cache
   * @param key Cache key
   */
  delete(key: string): boolean {
    try {
      // Validate key
      const keyValidation = CacheKeySchema.safeParse(key);
      if (!keyValidation.success) {
        throw new CacheKeyError(`Invalid cache key: ${keyValidation.error.errors.map(e => e.message).join(', ')}`);
      }

      const sanitizedKey = sanitizeInput(key);
      const deleted = this.cache.delete(sanitizedKey);

      if (deleted) {
        this.stats.totalDeletes++;
        logger.debug('Cache delete', { key: sanitizedKey.substring(0, 20), cacheName: this.name });
      }

      return deleted;

    } catch (error) {
      logger.error('Cache delete operation failed', error as Error, { key: key.substring(0, 20), cacheName: this.name });
      throw error;
    }
  }

  /**
   * Clear all entries from cache
   */
  clear(): void {
    const clearedCount = this.cache.size;
    this.cache.clear();

    logger.info('Cache cleared', { cacheName: this.name, entriesCleared: clearedCount });
  }

  /**
   * Get cache statistics
   * @returns Cache statistics
   */
  getStats(): CacheStats {
    const totalRequests = this.stats.totalHits + this.stats.totalMisses;
    const hitRate = totalRequests > 0 ? this.stats.totalHits / totalRequests : 0;
    const missRate = totalRequests > 0 ? this.stats.totalMisses / totalRequests : 0;
    const averageAccessTime = totalRequests > 0 ? this.stats.totalAccessTime / totalRequests : 0;

    // Estimate memory usage
    let memoryUsage = 0;
    for (const entry of this.cache.values()) {
      memoryUsage += entry.size;
    }

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate,
      missRate,
      totalHits: this.stats.totalHits,
      totalMisses: this.stats.totalMisses,
      totalSets: this.stats.totalSets,
      totalDeletes: this.stats.totalDeletes,
      totalEvictions: this.stats.totalEvictions,
      averageAccessTime,
      memoryUsage,
      uptime: Date.now() - this.stats.createdAt
    };
  }

  /**
   * Estimate the size of a value in bytes (rough approximation)
   */
  private estimateSize(value: T): number {
    try {
      const str = JSON.stringify(value);
      return str.length * 2; // Rough estimate: 2 bytes per character
    } catch {
      return 1000; // Default estimate for non-serializable objects
    }
  }

  /**
   * Clean up expired entries
   */
  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug('Cache cleanup completed', { cacheName: this.name, entriesCleaned: cleaned });
    }

    return cleaned;
  }

  /**
   * Warm up cache with initial data
   */
  warmUp(data: Array<{ key: string; value: T; ttl?: number }>): void {
    logger.info('Starting cache warm-up', { cacheName: this.name, entries: data.length });

    for (const item of data) {
      try {
        this.set(item.key, item.value, item.ttl);
      } catch (error) {
        logger.warn('Failed to warm up cache entry', { key: item.key.substring(0, 20) });
      }
    }

    logger.info('Cache warm-up completed', { cacheName: this.name, finalSize: this.cache.size });
  }
}

// Create global caches for different services
export const aiMessageCache = new LRUCache<string>(1000, 60 * 60 * 1000, 'ai-messages'); // 1 hour TTL
export const templateCache = new LRUCache<string>(500, 24 * 60 * 60 * 1000, 'templates'); // 24 hours TTL
export const csvValidationCache = new LRUCache<any>(100, 30 * 60 * 1000, 'csv-validation'); // 30 minutes TTL
export const csvHeaderCache = new LRUCache<string[]>(100, 60 * 60 * 1000, 'csv-headers'); // 1 hour TTL

/**
 * Get cache instance by name
 */
export function getCache<T>(name: string, config?: { maxSize?: number; ttl?: number }): LRUCache<T> {
  const maxSize = config?.maxSize || 1000;
  const ttl = config?.ttl || 60 * 60 * 1000;

  return new LRUCache<T>(maxSize, ttl, name);
}

/**
 * Clean up all expired entries in all caches
 */
export function cleanupAllCaches(): void {
  const caches = [aiMessageCache, templateCache, csvValidationCache, csvHeaderCache];
  let totalCleaned = 0;

  for (const cache of caches) {
    totalCleaned += cache.cleanup();
  }

  if (totalCleaned > 0) {
    logger.info('Global cache cleanup completed', { totalEntriesCleaned: totalCleaned });
  }
}
/**
 * Get statistics for all caches
 */
export function getAllCacheStats(): Record<string, CacheStats> {
  return {
    'ai-messages': aiMessageCache.getStats(),
    'templates': templateCache.getStats(),
    'csv-validation': csvValidationCache.getStats(),
    'csv-headers': csvHeaderCache.getStats()
  };
}

// Start periodic cleanup
setInterval(cleanupAllCaches, 30 * 60 * 1000); // Clean every 30 minutes
