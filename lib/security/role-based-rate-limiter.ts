/**
 * Role-Based Rate Limiting
 * Implements different rate limits for different user roles
 * Edge Runtime compatible - no server-side session access
 */

import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// In-memory store for rate limiting (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Role-based rate limit configuration
 */
export const ROLE_RATE_LIMITS = {
  admin: {
    requestsPerHour: 10000, // Unlimited (very high)
    requestsPerMinute: 1000,
  },
  leader: {
    requestsPerHour: 1000,
    requestsPerMinute: 100,
  },
  'co-leader': {
    requestsPerHour: 500,
    requestsPerMinute: 50,
  },
  member: {
    requestsPerHour: 100,
    requestsPerMinute: 10,
  },
} as const;

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  limit: number;
  retryAfter?: number;
}

/**
 * Check rate limit for a user based on their role
 * Edge Runtime compatible - uses JWT token instead of session
 */
export async function checkRoleBasedRateLimit(
  request: NextRequest,
  windowMs: number = 60 * 60 * 1000 // 1 hour default
): Promise<RateLimitResult> {
  try {
    // Get user token (works in Edge Runtime)
    const token = await getToken({ 
      req: request,
      secret: process.env.NEXTAUTH_SECRET 
    });
    
    if (!token) {
      // For unauthenticated requests, use strictest limit
      const ip = request.headers.get('x-forwarded-for') || 
                 request.headers.get('x-real-ip') || 
                 'unknown';
      return checkRateLimit(`ip:${ip}`, 50, windowMs);
    }
    
    const userId = token.sub || 'unknown';
    const userRole = (token as any)?.role || 'member';
    
    // Get rate limit for role
    const roleLimit = ROLE_RATE_LIMITS[userRole as keyof typeof ROLE_RATE_LIMITS] || ROLE_RATE_LIMITS.member;
    
    // Determine limit based on window
    const limit = windowMs === 60 * 1000 
      ? roleLimit.requestsPerMinute 
      : roleLimit.requestsPerHour;
    
    // Check rate limit
    return checkRateLimit(`user:${userId}`, limit, windowMs);
  } catch (error) {
    console.error('[Rate Limiter] Error checking rate limit:', error);
    // Fail open - allow request
    return {
      allowed: true,
      remaining: 0,
      resetTime: Date.now() + 60000,
      limit: 0,
    };
  }
}

/**
 * Core rate limit check function
 */
function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitStore.get(key);
  
  // Reset if window has expired
  if (!entry || now > entry.resetTime) {
    const newEntry = {
      count: 1,
      resetTime: now + windowMs,
    };
    rateLimitStore.set(key, newEntry);
    
    return {
      allowed: true,
      remaining: limit - 1,
      resetTime: newEntry.resetTime,
      limit,
    };
  }
  
  // Check if limit exceeded
  if (entry.count >= limit) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
      limit,
      retryAfter,
    };
  }
  
  // Increment count
  entry.count++;
  rateLimitStore.set(key, entry);
  
  return {
    allowed: true,
    remaining: limit - entry.count,
    resetTime: entry.resetTime,
    limit,
  };
}

/**
 * Get rate limit headers for response
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.resetTime / 1000)),
  };
  
  if (result.retryAfter) {
    headers['Retry-After'] = String(result.retryAfter);
  }
  
  return headers;
}

/**
 * Cleanup expired rate limit entries
 */
export function cleanupRateLimitStore(): number {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
      cleaned++;
    }
  }
  
  return cleaned;
}

// Auto cleanup every 5 minutes
if (typeof window === 'undefined') {
  setInterval(cleanupRateLimitStore, 5 * 60 * 1000);
}

/**
 * Middleware wrapper for API routes
 */
export function withRoleBasedRateLimit(
  handler: (request: NextRequest) => Promise<Response>
) {
  return async (request: NextRequest): Promise<Response> => {
    // Check rate limit
    const result = await checkRoleBasedRateLimit(request);
    
    if (!result.allowed) {
      const headers = getRateLimitHeaders(result);
      
      return new Response(
        JSON.stringify({
          error: 'Too many requests',
          message: `Rate limit exceeded. Please try again in ${result.retryAfter} seconds.`,
          retryAfter: result.retryAfter,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            ...headers,
          },
        }
      );
    }
    
    // Add rate limit headers to response
    const response = await handler(request);
    const headers = getRateLimitHeaders(result);
    
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    
    return response;
  };
}
