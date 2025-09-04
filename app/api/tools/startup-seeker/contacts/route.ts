import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '../../../../../utils/dbConfig';
import { ContactResearchJobs, AgritechStartups } from '../../../../../utils/schema';
import { eq, and } from 'drizzle-orm';
import { contactResearchQueue } from '../../../../../lib/queues';

// POST /api/tools/startup-seeker/contacts
// Enqueue a contact research job for a specific startup
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { startupId } = await request.json();

    if (!startupId) {
      return NextResponse.json(
        { error: 'Startup ID is required' },
        { status: 400 }
      );
    }

    const userId = session.user.email;
    const db = getDb();

    // Verify the startup belongs to the user
    const startup = await db
      .select()
      .from(AgritechStartups)
      .where(
        and(
          eq(AgritechStartups.id, startupId),
          eq(AgritechStartups.userId, userId)
        )
      )
      .limit(1);

    if (!startup || startup.length === 0) {
      return NextResponse.json(
        { error: 'Startup not found' },
        { status: 404 }
      );
    }

    const startupData = startup[0];

    // Create job record in database
    const jobRecord = await db
      .insert(ContactResearchJobs)
      .values({
        userId,
        startupId,
        startupName: startupData.name,
        website: startupData.website,
        status: 'pending',
      })
      .returning();

    const jobId = jobRecord[0].id;

    // Add job to queue
    await contactResearchQueue.add(
      'research-contacts',
      {
        userId,
        startupId,
        startupName: startupData.name,
        website: startupData.website,
        jobId,
      },
      {
        jobId,
        removeOnComplete: 100,
        removeOnFail: 200,
      }
    );

    return NextResponse.json({
      success: true,
      jobId,
      message: 'Contact research job enqueued successfully',
    });

  } catch (error) {
    console.error('Error enqueueing contact research job:', error);
    return NextResponse.json(
      { error: 'Failed to enqueue contact research job' },
      { status: 500 }
    );
  }
}
