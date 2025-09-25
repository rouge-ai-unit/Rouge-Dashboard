import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { simpleRateLimit } from '@/lib/rate-limit';
import { getContactMetrics } from '@/lib/cold-outreach/contacts';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting
    const rateLimitResult = await simpleRateLimit(session.user.id, 'contacts_metrics', 30);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    const metrics = await getContactMetrics(session.user.id);

    return NextResponse.json({ metrics });
  } catch (error) {
    console.error('Error fetching contact metrics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
