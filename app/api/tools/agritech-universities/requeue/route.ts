import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { agritechQueue, addAgritechExtractionJob, redisClient } from '@/lib/queues';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Authentication required', code: 'UNAUTHORIZED' }, { status: 401 });
    }

    const body = await request.json();
    const jobId = body?.jobId;
    if (!jobId || typeof jobId !== 'string') {
      return NextResponse.json({ error: 'Missing jobId', code: 'INVALID_REQUEST' }, { status: 400 });
    }

    try {
      // Try to read the original job from Redis-backed queue
      const original = await agritechQueue.getJob(jobId);
      if (original && original.data) {
        // Re-add the same payload as a new job
        const newJob = await addAgritechExtractionJob(original.data as any);
        return NextResponse.json({ success: true, jobId: newJob.id, message: 'Job requeued successfully' });
      }
    } catch (e) {
      // If queue access failed, fall back to a best-effort re-enqueue via stored metadata (if any)
      console.warn('Unable to read original job from queue, attempting best-effort requeue', e);
    }

    // If we couldn't read the original job, attempt to recover payload from Redis (if stored)
    try {
      const payloadKey = `jobpayload:agritech:${jobId}`;
      const payload = await redisClient.get(payloadKey);
      if (payload) {
        const data = JSON.parse(payload);
        const newJob = await addAgritechExtractionJob(data);
        return NextResponse.json({ success: true, jobId: newJob.id, message: 'Job requeued successfully (from payload cache)' });
      }
    } catch (e) {
      console.warn('Failed to requeue from payload cache:', e);
    }

    // As a last resort, instruct client that requeue isn't possible right now
    return NextResponse.json({ success: false, error: 'Unable to requeue job at this time', code: 'REQUEUE_UNAVAILABLE' }, { status: 503 });

  } catch (error) {
    console.error('Requeue route error:', error);
    return NextResponse.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
