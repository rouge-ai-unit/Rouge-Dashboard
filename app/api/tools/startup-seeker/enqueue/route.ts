import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { startupGenerationEngine } from '../../../../../lib/startup-generation-engine';
import { getDb } from '../../../../../utils/dbConfig';
import { StartupGenerationJobs, ContactResearchJobs } from '../../../../../utils/schema';
import { eq, desc } from 'drizzle-orm';
import { startupGenerationQueue, contactResearchQueue } from '../../../../../lib/queues';

// POST /api/tools/startup-seeker/enqueue
// Enqueue a startup generation job
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { numStartups = 10 } = await request.json();

    if (numStartups < 1 || numStartups > 50) {
      return NextResponse.json(
        { error: 'Number of startups must be between 1 and 50' },
        { status: 400 }
      );
    }

    const userId = session.user.email;
    const db = getDb();

    // Create job record in database
    const jobRecord = await db
      .insert(StartupGenerationJobs)
      .values({
        userId,
        numStartups,
        status: 'pending',
        progress: 0,
      })
      .returning();

    const jobId = jobRecord[0].id;

    // Add job to queue
    await startupGenerationQueue.add(
      'generate-startups',
      {
        userId,
        numStartups,
        jobId,
      },
      {
        jobId,
        removeOnComplete: 50,
        removeOnFail: 100,
      }
    );

    return NextResponse.json({
      success: true,
      jobId,
      message: 'Startup generation job enqueued successfully',
    });

  } catch (error) {
    console.error('Error enqueueing startup generation job:', error);
    return NextResponse.json(
      { error: 'Failed to enqueue job' },
      { status: 500 }
    );
  }
}
