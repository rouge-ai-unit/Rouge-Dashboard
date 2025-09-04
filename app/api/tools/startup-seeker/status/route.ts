import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '../../../../../utils/dbConfig';
import { StartupGenerationJobs, ContactResearchJobs } from '../../../../../utils/schema';
import { eq, and } from 'drizzle-orm';

// GET /api/tools/startup-seeker/status?jobId=xxx&type=generation|research
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    const type = searchParams.get('type');

    if (!jobId || !type || jobId === 'undefined' || jobId === 'null') {
      return NextResponse.json(
        { 
          error: 'Missing or invalid jobId or type parameter',
          message: 'This endpoint requires a valid jobId. The enhanced-generate endpoint returns results directly without job tracking.'
        },
        { status: 400 }
      );
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(jobId)) {
      return NextResponse.json(
        { error: 'Invalid jobId format' },
        { status: 400 }
      );
    }

    const userId = session.user.email;
    const db = getDb();

    let job;

    if (type === 'generation') {
      // Use standard jobs table
      job = await db
        .select()
        .from(StartupGenerationJobs)
        .where(
          and(
              eq(StartupGenerationJobs.id, jobId),
              eq(StartupGenerationJobs.userId, userId)
            )
          )
          .limit(1);
    } else if (type === 'research') {
      job = await db
        .select()
        .from(ContactResearchJobs)
        .where(
          and(
            eq(ContactResearchJobs.id, jobId),
            eq(ContactResearchJobs.userId, userId)
          )
        )
        .limit(1);
    } else {
      return NextResponse.json(
        { error: 'Invalid type. Must be "generation" or "research"' },
        { status: 400 }
      );
    }

    if (!job || job.length === 0) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    const jobData = job[0];
    
    // Handle progress field based on job type
    const progress = type === 'generation' && 'progress' in jobData 
      ? (jobData as any).progress || 0 
      : 0;
    
    return NextResponse.json({
      success: true,
      job: {
        ...jobData,
        progress,
        status: jobData.status || 'pending'
      },
    });

  } catch (error) {
    console.error('Error fetching job status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch job status' },
      { status: 500 }
    );
  }
}
