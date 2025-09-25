/**
 * Client-Safe Utilities
 * 
 * This file contains utilities that can be safely used in both client and server environments
 * without Node.js-specific APIs that cause build issues in Next.js Edge Runtime.
 */

/**
 * Client-safe logger interface
 */
export interface ClientLogger {
  info: (message: string, meta?: Record<string, any>) => void;
  error: (message: string, error?: Error, meta?: Record<string, any>) => void;
  warn: (message: string, meta?: Record<string, any>) => void;
  debug: (message: string, meta?: Record<string, any>) => void;
}

/**
 * Client-safe logger implementation
 */
export const logger: ClientLogger = {
  info: (message: string, meta?: Record<string, any>) => {
    if (typeof window !== 'undefined') {
      console.log(`[INFO] ${message}`, meta || '');
    }
  },

  error: (message: string, error?: Error, meta?: Record<string, any>) => {
    if (typeof window !== 'undefined') {
      console.error(`[ERROR] ${message}`, error, meta || '');
    }
  },

  warn: (message: string, meta?: Record<string, any>) => {
    if (typeof window !== 'undefined') {
      console.warn(`[WARN] ${message}`, meta || '');
    }
  },

  debug: (message: string, meta?: Record<string, any>) => {
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      console.debug(`[DEBUG] ${message}`, meta || '');
    }
  }
};

/**
 * Custom error classes
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class AppError extends Error {
  constructor(message: string, public statusCode: number = 500) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * Input sanitization utility
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .substring(0, 1000); // Limit length
}

/**
 * Retry utility with exponential backoff
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  shouldRetry?: (error: Error, attempt: number) => boolean
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (shouldRetry && !shouldRetry(lastError, attempt)) {
        throw lastError;
      }

      if (attempt === maxRetries) {
        throw lastError;
      }

      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

/**
 * Performance monitoring wrapper (client-safe)
 */
export function withPerformanceMonitoring<T extends (...args: any[]) => any>(
  fn: T,
  operationName: string
): T {
  return ((...args: Parameters<T>) => {
    const start = performance.now();
    
    try {
      const result = fn(...args);
      
      if (result instanceof Promise) {
        return result.finally(() => {
          const duration = performance.now() - start;
          logger.debug(`Operation ${operationName} completed`, { duration });
        });
      } else {
        const duration = performance.now() - start;
        logger.debug(`Operation ${operationName} completed`, { duration });
        return result;
      }
    } catch (error) {
      const duration = performance.now() - start;
      logger.error(`Operation ${operationName} failed`, error as Error, { duration });
      throw error;
    }
  }) as T;
}
