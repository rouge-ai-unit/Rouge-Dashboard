import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { agritechQueue, redisClient } from '@/lib/queues';

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

    const cancelKey = `cancel:agritech:${jobId}`;

    // First attempt: if possible, remove the job before it starts
    try {
      const job = await agritechQueue.getJob(jobId);
      if (job) {
        const state = await job.getState();
        if (state === 'waiting' || state === 'delayed' || state === 'paused') {
          await job.remove();
          // Ensure any leftover cancel key is removed
          try { await redisClient.del(cancelKey); } catch (e) { /* ignore */ }
          return NextResponse.json({ success: true, canceled: true, message: 'Job removed before processing.' });
        }

        // If job exists and is active/running, try to set a cancel flag (best-effort)
        if (state === 'active' || state === 'processing' || state === 'started' || state === 'running') {
          try {
            const setRes = await redisClient.setEx(cancelKey, 60 * 30, '1'); // 30 minutes TTL
            if (setRes === null) {
              // Redis likely unreachable
              return NextResponse.json({
                success: false,
                canceled: false,
                code: 'REDIS_UNREACHABLE',
                message: 'Worker running but Redis is unreachable. Start Redis and try cancelling again.'
              }, { status: 503 });
            }
            return NextResponse.json({ success: true, canceled: true, message: 'Cancel signal sent. Running job will stop shortly.' });
          } catch (e) {
            console.error('Failed to set cancel key in Redis:', e);
            return NextResponse.json({ success: false, canceled: false, message: 'Failed to send cancel signal. Try again later.' }, { status: 500 });
          }
        }
      }
    } catch (e: any) {
      // agritechQueue.getJob may return null silently when the queue/redis is unavailable.
      // Fall through to best-effort cancel below.
      console.warn('Queue access or job lookup failed (will attempt best-effort cancel):', e?.message || e);
    }

    // If we reach here it means job was not removable or queue access failed.
    // Best-effort: set a cancel key in Redis so any worker that can read it will stop.
    try {
      const setRes = await redisClient.setEx(cancelKey, 60 * 30, '1');
      if (setRes === null) {
        // Redis unreachable — we cannot reliably cancel a running job across processes.
        return NextResponse.json({
          success: false,
          canceled: false,
          code: 'REDIS_UNREACHABLE',
          message: 'Unable to reach Redis to send a cancel signal. Start Redis and try again. If the job is queued, it will not be processed until Redis is available.'
        }, { status: 503 });
      }

      return NextResponse.json({ success: true, canceled: true, message: 'Cancel signal set (best-effort). Worker will stop when it notices the signal.' });
    } catch (e) {
      console.error('Cancel route final error:', e);
      return NextResponse.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, { status: 500 });
    }

  } catch (error) {
    console.error('Cancel route error:', error);
    return NextResponse.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
