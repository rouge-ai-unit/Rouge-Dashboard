import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { getDb } from '@/utils/dbConfig';
import { AgTechEvents, AgTechEventSearchHistory } from '@/utils/schema';
import { findAgTechEvents } from '@/lib/agtech-event-finder/gemini-service';
import { getCachedEvents, setCachedEvents } from '@/lib/agtech-event-finder/event-cache';
import type { AgTechEventSearchResponse, AgTechEventError } from '@/types/agtech-event-finder';

/**
 * AgTech Events API Route
 * POST /api/agtech-events
 * 
 * Searches for AgTech events near a specified location
 * Requires authentication
 */

// Request validation schema
const searchRequestSchema = z.object({
  location: z.string().min(2, 'Location must be at least 2 characters').max(200, 'Location is too long'),
});

// Rate limiting: Simple in-memory store (consider Redis for production)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 10; // requests per window
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute

/**
 * Check if user has exceeded rate limit
 */
function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userLimit = rateLimitStore.get(userId);

  if (!userLimit || now > userLimit.resetAt) {
    // Reset or initialize
    rateLimitStore.set(userId, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW,
    });
    return true;
  }

  if (userLimit.count >= RATE_LIMIT_MAX) {
    return false;
  }

  userLimit.count++;
  return true;
}

/**
 * POST handler for searching AgTech events
 * Enterprise-grade with comprehensive error handling, logging, and monitoring
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session || !session.user) {
      console.warn('[AgTech API] Unauthorized access attempt');
      const errorResponse: AgTechEventError = {
        error: 'Unauthorized',
        code: 'UNAUTHORIZED',
        details: 'You must be logged in to search for events',
      };
      return NextResponse.json(errorResponse, { status: 401 });
    }

    const userId = session.user.email || 'anonymous';
    console.log(`[AgTech API] Request from user: ${userId}`);

    // Check rate limit
    if (!checkRateLimit(userId)) {
      const errorResponse: AgTechEventError = {
        error: 'Rate limit exceeded',
        code: 'RATE_LIMIT_EXCEEDED',
        details: `Maximum ${RATE_LIMIT_MAX} requests per minute allowed`,
      };
      return NextResponse.json(errorResponse, { status: 429 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = searchRequestSchema.safeParse(body);

    if (!validationResult.success) {
      const errorResponse: AgTechEventError = {
        error: 'Invalid request',
        code: 'VALIDATION_ERROR',
        details: validationResult.error.errors[0]?.message || 'Invalid location',
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    const { location } = validationResult.data;

    // Sanitize location input
    const sanitizedLocation = location.trim().replace(/[<>]/g, '');

    console.log(`[AgTech API] User ${userId} searching for events near: ${sanitizedLocation}`);

    // Check cache first
    const cachedEvents = getCachedEvents(sanitizedLocation);
    if (cachedEvents) {
      console.log(`[AgTech API] Cache hit for location: ${sanitizedLocation}`);
      const response: AgTechEventSearchResponse = {
        events: cachedEvents,
        searchedLocation: sanitizedLocation,
        timestamp: new Date().toISOString(),
      };
      return NextResponse.json(response, { 
        status: 200,
        headers: {
          'X-Cache': 'HIT',
        },
      });
    }

    // Fetch from Gemini API
    const events = await findAgTechEvents(sanitizedLocation);

    // Cache the results
    setCachedEvents(sanitizedLocation, events);

    // Save events to database (async, non-blocking)
    try {
      const db = getDb();
      
      // Use Promise.all for parallel inserts (better performance)
      const eventInserts = events.map(event =>
        db.insert(AgTechEvents).values({
          eventName: event.eventName,
          date: event.date,
          location: event.location,
          description: event.description,
          price: event.price,
          registrationLink: event.registrationLink,
          searchLocation: sanitizedLocation,
          userId: userId,
        })
      );

      await Promise.all(eventInserts);

      // Save search history
      await db.insert(AgTechEventSearchHistory).values({
        userId: userId,
        location: sanitizedLocation,
        resultsCount: events.length,
      });

      console.log(`[AgTech API] Saved ${events.length} events to database for user ${userId}`);
    } catch (dbError) {
      console.error('[AgTech API] Error saving to database:', dbError);
      // Continue even if DB save fails - we still have the results
      // In production, you might want to send this to a monitoring service
    }

    const response: AgTechEventSearchResponse = {
      events,
      searchedLocation: sanitizedLocation,
      timestamp: new Date().toISOString(),
    };

    const duration = Date.now() - startTime;
    console.log(`[AgTech API] Request completed successfully in ${duration}ms - Found ${events.length} events`);

    return NextResponse.json(response, { 
      status: 200,
      headers: {
        'X-Response-Time': `${duration}ms`,
        'X-Events-Count': events.length.toString(),
      },
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[AgTech API] Error processing request after ${duration}ms:`, error);

    // Log error details for monitoring
    if (error instanceof Error) {
      console.error('[AgTech API] Error stack:', error.stack);
    }

    const errorResponse: AgTechEventError = {
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      details: error instanceof Error ? error.message : 'An unexpected error occurred',
    };

    return NextResponse.json(errorResponse, { 
      status: 500,
      headers: {
        'X-Response-Time': `${duration}ms`,
      },
    });
  }
}

/**
 * GET handler - return method not allowed
 */
export async function GET() {
  const errorResponse: AgTechEventError = {
    error: 'Method not allowed',
    code: 'METHOD_NOT_ALLOWED',
    details: 'Use POST to search for events',
  };
  return NextResponse.json(errorResponse, { status: 405 });
}
