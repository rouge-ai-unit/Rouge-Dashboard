import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/utils/dbConfig';
import { OutreachSessions } from '@/utils/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const sessionActionSchema = z.object({
  action: z.string(),
  metadata: z.record(z.any()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const db = getDb();
    const body = await request.json();
    const { action, metadata } = sessionActionSchema.parse(body);

    const userId = session.user.id;
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create or update session
    await db.insert(OutreachSessions).values({
      userId,
      sessionId,
      ipAddress: request.headers.get('x-forwarded-for') ||
                 request.headers.get('x-real-ip') ||
                 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      actions: [{ action, timestamp: new Date().toISOString(), metadata }],
      metadata: {
        totalListsGenerated: 0,
        totalLeadsViewed: 0,
        exportCount: 0,
        searchQueries: [],
      },
    }).onConflictDoUpdate({
      target: OutreachSessions.sessionId,
      set: {
        actions: [...(await db.select({ actions: OutreachSessions.actions })
          .from(OutreachSessions)
          .where(eq(OutreachSessions.sessionId, sessionId))
          .then(rows => rows[0]?.actions || [])), {
          action,
          timestamp: new Date().toISOString(),
          metadata
        }],
        endedAt: null,
      }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Session tracking error:', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}