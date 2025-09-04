import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { addAgritechExtractionJob, redisClient } from "@/lib/queues";

// Rate limiting using Redis for production readiness
const RATE_LIMIT = 5; // jobs per hour per user
const RATE_WINDOW = 60 * 60 * 1000; // 1 hour

async function checkRateLimit(userId: string): Promise<boolean> {
  try {
    const now = Date.now();
    const key = `ratelimit:${userId}`;

    // Get current count and reset time
    const current = await redisClient.get(key);
    const data = current ? JSON.parse(current) : { count: 0, resetTime: now + RATE_WINDOW };

    if (now > data.resetTime) {
      // Reset the limit
      data.count = 1;
      data.resetTime = now + RATE_WINDOW;
    } else if (data.count >= RATE_LIMIT) {
      return false;
    } else {
      data.count++;
    }

    // Store updated data with expiration
    await redisClient.setEx(key, Math.ceil(RATE_WINDOW / 1000), JSON.stringify(data));
    return true;
  } catch (error) {
    console.error("Rate limit check failed:", error);
    // Fallback to allow request if Redis fails
    return true;
  }
}

const enqueueSchema = z.object({
  limit: z.number().int().min(1).max(100),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Authentication required", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    // Check rate limit
    const rateLimitAllowed = await checkRateLimit(session.user.email);
    if (!rateLimitAllowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded. Please try again later.",
          code: "RATE_LIMIT_EXCEEDED",
          retryAfter: Math.ceil(RATE_WINDOW / 1000)
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { limit } = enqueueSchema.parse(body);

    // Validate limit range
    if (limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: "Limit must be between 1 and 100", code: "INVALID_LIMIT" },
        { status: 400 }
      );
    }

    // Add job to queue
    const job = await addAgritechExtractionJob({
      userId: session.user.email,
      limit,
      session,
    });

    // Persist the payload in Redis as a fallback for requeue (24 hours)
    try {
      const payloadKey = `jobpayload:agritech:${job.id}`;
      await redisClient.setEx(payloadKey, 60 * 60 * 24, JSON.stringify({ userId: session.user.email, limit, session }));
    } catch (e) {
      // Best-effort, ignore Redis failures here
      console.warn('Failed to cache job payload for requeue:', e);
    }

    console.log(`Job ${job.id} enqueued for user ${session.user.email} with limit ${limit}`);

    return NextResponse.json({
      success: true,
      jobId: job.id,
      message: "Job enqueued successfully. Processing will begin shortly.",
      estimatedTime: "2-5 minutes depending on load",
      limit: limit
    });

  } catch (error) {
    console.error("Error enqueueing agritech job:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", code: "VALIDATION_ERROR", details: error.errors },
        { status: 400 }
      );
    }

    // Handle queue service unavailability
    if (error instanceof Error && error.message.includes('Queue service unavailable')) {
      return NextResponse.json(
        {
          error: "Background processing service is currently unavailable. Please try again later or contact support.",
          code: "SERVICE_UNAVAILABLE",
          details: "The queue system requires Redis to be running and compatible. Please ensure Redis v5.0+ is installed and running."
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
