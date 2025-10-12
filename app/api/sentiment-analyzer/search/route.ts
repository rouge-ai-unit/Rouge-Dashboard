// ============================================================================
// SENTIMENT ANALYZER - SEARCH API ROUTE
// POST /api/sentiment-analyzer/search
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { searchCompanySentiment } from '@/lib/sentiment-analyzer/google-search';
import { analyzeSentimentWithContext } from '@/lib/sentiment-analyzer/sentiment-analysis';
import { 
  saveArticles, 
  saveSearchHistory, 
  checkUsageLimit, 
  incrementUsage 
} from '@/lib/sentiment-analyzer/database';
import { SearchSentimentRequest, SearchSentimentResponse } from '@/types/sentiment-analyzer';

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
    const body: SearchSentimentRequest = await request.json();
    const { companyQuery, country = '', aiModel = 'gemini' } = body;

    if (!companyQuery || companyQuery.trim().length === 0) {
      return NextResponse.json(
        { success: false, message: 'Company query is required' },
        { status: 400 }
      );
    }

    if (!['gemini', 'deepseek'].includes(aiModel)) {
      return NextResponse.json(
        { success: false, message: 'Invalid AI model. Choose gemini or deepseek' },
        { status: 400 }
      );
    }

    // Convert country name to country code or use empty for worldwide
    const countryCode = country.trim().toLowerCase() || '';
    const countryDisplay = countryCode ? countryCode.toUpperCase() : 'Worldwide';

    if (companyQuery.length > 255) {
      return NextResponse.json(
        { success: false, message: 'Company query is too long (max 255 characters)' },
        { status: 400 }
      );
    }

    // 3. Check API usage limit (100/day)
    const usageCheck = await checkUsageLimit(userId);
    if (!usageCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          message: `Daily limit reached (${usageCheck.limit} searches per day). Resets at ${usageCheck.resetAt.toISOString()}`,
          usage: {
            current: usageCheck.current,
            limit: usageCheck.limit,
            resetAt: usageCheck.resetAt.toISOString(),
          },
        },
        { status: 429 }
      );
    }

    console.log(`[Sentiment Search] User: ${userId}, Company: ${companyQuery}, Country: ${countryDisplay}, AI Model: ${aiModel.toUpperCase()}`);

    // 4. Search Google for articles
    console.log('[Step 1/3] Searching Google for articles...');
    const searchResults = await searchCompanySentiment(companyQuery, countryCode);

    if (searchResults.length === 0) {
      return NextResponse.json({
        success: true,
        articles: [],
        count: 0,
        message: 'No articles found for this company',
      });
    }

    console.log(`[Step 1/3] Found ${searchResults.length} articles`);

    // 5. Analyze sentiment with selected AI model
    console.log(`[Step 2/3] Analyzing sentiment with ${aiModel.toUpperCase()}...`);
    const analyzedArticles = await analyzeSentimentWithContext(searchResults, companyQuery, aiModel);

    console.log(`[Step 2/3] Analyzed ${analyzedArticles.length} articles`);

    // 6. Save articles to database
    console.log('[Step 3/3] Saving to database...');
    const articlesToSave = analyzedArticles.map(article => ({
      companyQuery,
      descriptionQuery: `${companyQuery} ${country}`,
      title: article.title,
      link: article.link,
      snippet: article.snippet,
      sentiment: article.sentiment,
      reasoning: article.reasoning,
      userId,
    }));

    const savedArticles = await saveArticles(articlesToSave);

    // 7. Save search history
    await saveSearchHistory(companyQuery, userId, savedArticles.length);

    // 8. Increment usage count
    await incrementUsage(userId);

    console.log(`[Step 3/3] Saved ${savedArticles.length} articles`);
    console.log('[Sentiment Search] Complete!');

    // 9. Return response
    const response: SearchSentimentResponse = {
      success: true,
      articles: savedArticles,
      count: savedArticles.length,
      message: `Successfully analyzed ${savedArticles.length} articles`,
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('[Sentiment Search] Error:', error);

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('GOOGLE_SEARCH_API_KEY')) {
        return NextResponse.json(
          { success: false, message: 'Google Search API is not configured' },
          { status: 500 }
        );
      }

      if (error.message.includes('GEMINI_API_KEY')) {
        return NextResponse.json(
          { success: false, message: 'Gemini API is not configured' },
          { status: 500 }
        );
      }

      if (error.message.includes('DEEPSEEK_API_KEY')) {
        return NextResponse.json(
          { success: false, message: 'DeepSeek API is not configured' },
          { status: 500 }
        );
      }

      if (error.message.includes('rate limit')) {
        return NextResponse.json(
          { success: false, message: 'API rate limit exceeded. Please try again later.' },
          { status: 429 }
        );
      }
    }

    return NextResponse.json(
      { 
        success: false, 
        message: 'An error occurred while analyzing sentiment. Please try again.',
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
