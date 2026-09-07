// ============================================================================
// CONTACT FINDER — DOMAIN SEARCH
// POST /api/contact-finder/domain-search
// Search by Job Title: fetch every email Hunter has for the company, then
// filter client-side by a case-insensitive regex on `position`. The rows that
// pass the filter (max 10) are run through the Email Verifier.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { domainSearch, filterByJobTitle, verifyEmail } from '@/lib/contact-finder/hunterClient';
import { hunterErrorResponse } from '@/lib/contact-finder/routeHelpers';
import { DomainSearchRequest, DomainContact } from '@/types/contact-finder';

const MAX_VERIFY = 10;

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized. Please sign in.' },
        { status: 401 }
      );
    }

    const body: DomainSearchRequest = await request.json();
    const jobTitle = (body.jobTitle ?? '').trim();
    const company = (body.company ?? '').trim();
    const showAll = body.showAll === true;

    if (!jobTitle || !company) {
      return NextResponse.json(
        { success: false, message: 'Job title and company are required.' },
        { status: 400 }
      );
    }
    if (jobTitle.length > 255 || company.length > 255) {
      return NextResponse.json(
        { success: false, message: 'Input values are too long.' },
        { status: 400 }
      );
    }

    const data = await domainSearch({ company });
    const emails = data.emails ?? [];
    const matched = filterByJobTitle(emails, jobTitle);
    const rows = showAll && matched.length === 0 ? emails : matched;

    // Verify only the first MAX_VERIFY rows to keep credit usage bounded.
    const verifications = await Promise.all(
      rows.slice(0, MAX_VERIFY).map((e) => (e.value ? verifyEmail(e.value) : Promise.resolve(null)))
    );

    const contacts: DomainContact[] = rows.map((e, i) => ({
      name: `${e.first_name ?? ''} ${e.last_name ?? ''}`.trim() || null,
      position: e.position ?? null,
      email: e.value ?? null,
      confidence: e.confidence ?? null,
      department: e.department ?? null,
      seniority: e.seniority ?? null,
      verification: i < MAX_VERIFY ? verifications[i] : null,
    }));

    return NextResponse.json({
      success: true,
      company,
      domain: data.domain ?? null,
      jobTitle,
      matchedCount: matched.length,
      totalCount: emails.length,
      showingAll: showAll && matched.length === 0 && emails.length > 0,
      contacts,
    });
  } catch (error) {
    return hunterErrorResponse(error, '[Contact Finder] domain-search error:');
  }
}
