import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { startupGenerationEngine } from '../../../../../lib/startup-generation-engine';

// GET /api/tools/startup-seeker/results
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const minScore = searchParams.get('minScore') ? parseInt(searchParams.get('minScore')!) : undefined;
    const isPriority = searchParams.get('isPriority') ? searchParams.get('isPriority') === 'true' : undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;

    const userId = session.user.email;

    const startups = await startupGenerationEngine.getUserStartups(userId, {
      minScore,
      isPriority,
      limit,
    });

    return NextResponse.json({
      success: true,
      startups,
      count: startups.length,
    });

  } catch (error) {
    console.error('Error fetching startup results:', error);
    return NextResponse.json(
      { error: 'Failed to fetch startup results' },
      { status: 500 }
    );
  }
}
