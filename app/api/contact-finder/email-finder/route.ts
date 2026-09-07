// ============================================================================
// CONTACT FINDER — EMAIL FINDER
// POST /api/contact-finder/email-finder
// Search by Name: full name + company → Hunter Email Finder → one best email,
// always followed by an Email Verifier check.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { emailFinder, verifyEmail } from '@/lib/contact-finder/hunterClient';
import { hunterErrorResponse } from '@/lib/contact-finder/routeHelpers';
import { EmailFinderRequest } from '@/types/contact-finder';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized. Please sign in.' },
        { status: 401 }
      );
    }

    const body: EmailFinderRequest = await request.json();
    const fullName = (body.fullName ?? '').trim();
    const company = (body.company ?? '').trim();

    if (!fullName || !company) {
      return NextResponse.json(
        { success: false, message: 'Full name and company are required.' },
        { status: 400 }
      );
    }
    if (fullName.length > 255 || company.length > 255) {
      return NextResponse.json(
        { success: false, message: 'Input values are too long.' },
        { status: 400 }
      );
    }

    const data = await emailFinder({ fullName, company });

    if (!data.email) {
      return NextResponse.json({
        success: true,
        email: null,
        message: 'No email found for that name and company.',
      });
    }

    const verification = await verifyEmail(data.email);

    return NextResponse.json({
      success: true,
      email: data.email,
      score: data.score ?? null,
      position: data.position ?? null,
      company: data.company ?? null,
      domain: data.domain ?? null,
      sources: data.sources ?? [],
      verification,
    });
  } catch (error) {
    return hunterErrorResponse(error, '[Contact Finder] email-finder error:');
  }
}
