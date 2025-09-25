/**
 * Standardized API Response Helpers for Startup Seeker
 * Enterprise-grade error handling and response formatting
 */

import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

// Rate limiter store typing on globalThis
type RateLimiterEntry = { count: number; reset: number };
type RateLimiterStore = Map<string, RateLimiterEntry>;
declare global {
  var __rateLimiter: RateLimiterStore | undefined;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
  requestId?: string;
}

export interface ApiSuccess<T = any> {
  success: true;
  data: T;
  metadata?: {
    timestamp: string;
    processingTime?: number;
    version: string;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  metadata?: {
    timestamp: string;
    processingTime?: number;
    version: string;
  };
}

/**
 * Generate standardized error response
 */
export function createErrorResponse(
  error: string | Error | ZodError,
  code: string = 'INTERNAL_ERROR',
  status: number = 500,
  details?: any
): NextResponse {
  let errorMessage: string;
  let errorDetails: any = details;

  if (error instanceof ZodError) {
    errorMessage = 'Validation failed';
    errorDetails = error.errors;
    code = 'VALIDATION_ERROR';
    status = 400;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  } else {
    errorMessage = error;
  }

  const apiError: ApiError = {
    code,
    message: errorMessage,
    details: errorDetails,
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(
    {
      success: false,
      error: apiError,
      metadata: {
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }
    },
    { status }
  );
}

/**
 * Generate standardized success response
 */
export function createSuccessResponse<T>(
  data: T,
  metadata?: Partial<ApiSuccess['metadata']>
): NextResponse {
  const response: ApiSuccess<T> = {
    success: true,
    data,
    metadata: {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      ...metadata
    }
  };

  return NextResponse.json(response);
}

/**
 * Validation helpers
 */
export const ValidationErrors = {
  UNAUTHORIZED: { code: 'UNAUTHORIZED', message: 'Authentication required', status: 401 },
  FORBIDDEN: { code: 'FORBIDDEN', message: 'Access denied', status: 403 },
  NOT_FOUND: { code: 'NOT_FOUND', message: 'Resource not found', status: 404 },
  INVALID_INPUT: { code: 'INVALID_INPUT', message: 'Invalid input data', status: 400 },
  RATE_LIMITED: { code: 'RATE_LIMITED', message: 'Too many requests', status: 429 },
  INTERNAL_ERROR: { code: 'INTERNAL_ERROR', message: 'Internal server error', status: 500 }
} as const;

/**
 * Rate limiting helper
 */
export function isRateLimited(userId: string, action: string): boolean {
  // Simple in-memory token-bucket per user+action
  // Not durable across server restarts; suitable as a guardrail
  const WINDOW_MS = 60 * 1000; // 1 minute window
  const LIMITS: Record<string, number> = {
    // Action-specific per-minute limits
    startup_generation: 6,
    startup_deletion: 20,
    contact_research: 10,
    results_fetch: 120,
    default: 60
  };

  const key = `${userId}:${action}`;
  if (!globalThis.__rateLimiter) {
    globalThis.__rateLimiter = new Map<string, RateLimiterEntry>();
  }
  const store: RateLimiterStore = globalThis.__rateLimiter;
  const now = Date.now();
  const limit = LIMITS[action] ?? LIMITS.default;
  const entry = store.get(key);

  if (!entry || now > entry.reset) {
    store.set(key, { count: 1, reset: now + WINDOW_MS });
    return false;
  }

  if (entry.count >= limit) {
    return true;
  }

  entry.count += 1;
  store.set(key, entry);
  return false;
}

/**
 * Input sanitization
 */
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential XSS chars
    .slice(0, 1000); // Limit length
}

/**
 * UUID validation
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}
