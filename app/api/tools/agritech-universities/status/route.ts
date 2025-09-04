import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { getJobStatus } from "@/lib/queues";
import { redisClient } from '@/lib/queues';

const statusSchema = z.object({
  jobId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body;
    try {
      const text = await request.text();
      if (!text || text.trim() === '') {
        return NextResponse.json({ error: "Empty request body" }, { status: 400 });
      }
      body = JSON.parse(text);
    } catch (parseError) {
      console.error("JSON parse error in status route:", parseError);
      return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
    }

    const { jobId } = statusSchema.parse(body);

    const jobStatus = await getJobStatus(jobId);

    // Check for cancel flag
    try {
      const cancelKey = `cancel:agritech:${jobId}`;
      const cancelled = await redisClient.get(cancelKey);
      if (cancelled) {
        return NextResponse.json({ jobId, state: 'cancelled', progress: 0, failedReason: 'Cancelled by user', code: 'CANCELLED' });
      }
    } catch (e) {
      // ignore redis errors
    }

    if (!jobStatus) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      jobId: jobStatus.id,
      state: jobStatus.state,
      progress: jobStatus.progress,
      result: jobStatus.result,
      failedReason: jobStatus.failedReason,
      createdAt: jobStatus.createdAt,
      processedAt: jobStatus.processedAt,
      finishedAt: jobStatus.finishedAt,
    });

  } catch (error) {
    console.error("Error checking job status:", error);
    return NextResponse.json(
      { error: "Failed to check job status" },
      { status: 500 }
    );
  }
}
