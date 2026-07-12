// ============================================================================
// CONTACT FINDER — SEARCH API ROUTE
// POST /api/contact-finder/search
// Main endpoint that orchestrates the contact finding pipeline
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generatePrompt } from '@/lib/contact-finder/promptGenerator';
import { searchWithPerplexity } from '@/lib/contact-finder/perplexityClient';
import { parseEntities } from '@/lib/contact-finder/entityExtractor';
import { saveSearch, saveContacts } from '@/lib/contact-finder/database';
import { SearchContactRequest } from '@/types/contact-finder';

export async function POST(request: NextRequest) {
  try {
    // 1. Authentication check
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized. Please sign in.' },
        { status: 401 }
      );
    }

    const userId = session.user.email;

    // 2. Parse and validate request body
    const body: SearchContactRequest = await request.json();
    const { company, role, country } = body;
    const finalCountry = country && country.trim().length > 0 ? country.trim() : 'Global';

    if (!company || company.trim().length === 0) {
      return NextResponse.json(
        { success: false, message: 'Company name is required.' },
        { status: 400 }
      );
    }

    if (!role || role.trim().length === 0) {
      return NextResponse.json(
        { success: false, message: 'Target role/title is required.' },
        { status: 400 }
      );
    }

    // Validate input lengths
    if (company.length > 255 || role.length > 255 || finalCountry.length > 100) {
      return NextResponse.json(
        { success: false, message: 'Input values are too long.' },
        { status: 400 }
      );
    }

    console.log(`[Contact Finder] User: ${userId}, Company: ${company}, Role: ${role}, Country: ${finalCountry}`);

    // 3. Generate the optimized search prompt
    console.log('[Step 1/4] Generating search prompt...');
    const prompt = generatePrompt(company.trim(), role.trim(), finalCountry);

    // 4. Send prompt to Perplexity AI
    console.log('[Step 2/4] Searching with Perplexity AI...');
    const perplexityResponse = await searchWithPerplexity(prompt);

    if (!perplexityResponse.text || perplexityResponse.text.trim().length === 0) {
      return NextResponse.json({
        success: true,
        contacts: [],
        message: 'No results found for this search. Try different search criteria.',
      });
    }

    // 5. Parse and extract structured entities using NLP
    console.log('[Step 3/4] Extracting entities with NLP...');
    const contacts = parseEntities(perplexityResponse.text, perplexityResponse.citations);

    console.log(`[Step 3/4] Extracted ${contacts.length} contacts`);

    // 6. Save results to database
    console.log('[Step 4/4] Saving to database...');
    const savedSearch = await saveSearch(
      userId,
      company.trim(),
      role.trim(),
      finalCountry,
      perplexityResponse.text,
      perplexityResponse.citations
    );

    const savedContacts = await saveContacts(savedSearch.id, contacts);

    console.log(`[Step 4/4] Saved search ${savedSearch.id} with ${savedContacts.length} contacts`);
    console.log('[Contact Finder] Search complete!');

    // 7. Return structured response
    return NextResponse.json({
      success: true,
      searchId: savedSearch.id,
      company: company.trim(),
      role: role.trim(),
      country: finalCountry,
      contacts: savedContacts,
      rawResponse: perplexityResponse.text,
      citations: perplexityResponse.citations,
      createdAt: savedSearch.createdAt,
    });

  } catch (error) {
    console.error('[Contact Finder] Error:', error);

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('PERPLEXITY_API_KEY')) {
        return NextResponse.json(
          { success: false, message: 'Perplexity API is not configured. Please contact the administrator.' },
          { status: 500 }
        );
      }

      if (error.message.includes('rate limit')) {
        return NextResponse.json(
          { success: false, message: 'API rate limit exceeded. Please try again later.' },
          { status: 429 }
        );
      }

      if (error.message.includes('Invalid Perplexity API key')) {
        return NextResponse.json(
          { success: false, message: 'Invalid API key. Please contact the administrator.' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred while searching for contacts. Please try again.',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// OPTIONS for CORS
export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}
