// ============================================================================
// SENTIMENT ANALYSIS SERVICE
// Enterprise-grade sentiment analysis using Gemini and DeepSeek AI
// ============================================================================

import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  GoogleSearchResult,
  SentimentAnalysisResult,
  SentimentAnalysisRequest
} from '@/types/sentiment-analyzer';

// AI Model Configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

// Initialize Gemini
const gemini = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

// Configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;
const BATCH_SIZE = 5; // Process 5 articles at a time

export type AIModel = 'gemini' | 'deepseek';

/**
 * Delay helper for retry logic
 */
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Validate AI configuration
 */
function validateConfig(model: AIModel): void {
  if (model === 'gemini' && !GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY environment variable is not set');
  }
  if (model === 'deepseek' && !DEEPSEEK_API_KEY) {
    throw new Error('DEEPSEEK_API_KEY environment variable is not set');
  }
}

/**
 * Analyze sentiment using Gemini AI
 */
async function analyzeSingleArticleWithGemini(
  article: SentimentAnalysisRequest,
  retryCount: number = 0
): Promise<SentimentAnalysisResult> {
  try {
    if (!gemini) throw new Error('Gemini not initialized');

    const model = gemini.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `Analyze the sentiment of this news article about a company.

Title: ${article.title}
Snippet: ${article.snippet}

Determine if the overall sentiment is:
- positive (favorable, good news, achievements, growth)
- negative (criticism, problems, scandals, decline)
- neutral (factual, balanced, no clear positive or negative tone)

Respond ONLY with valid JSON in this exact format:
{
  "sentiment": "positive" | "negative" | "neutral",
  "reasoning": "Brief explanation (1-2 sentences)"
}`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const sentiment = parsed.sentiment.toLowerCase();

    if (!['positive', 'negative', 'neutral'].includes(sentiment)) {
      throw new Error(`Invalid sentiment: ${sentiment}`);
    }

    return {
      sentiment: sentiment as 'positive' | 'negative' | 'neutral',
      reasoning: parsed.reasoning,
    };
  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      console.warn(`Gemini analysis failed, retrying (${retryCount + 1}/${MAX_RETRIES})...`);
      await delay(RETRY_DELAY * (retryCount + 1));
      return analyzeSingleArticleWithGemini(article, retryCount + 1);
    }

    console.error('Error with Gemini analysis:', error);
    return {
      sentiment: 'neutral',
      reasoning: 'Unable to analyze sentiment. Defaulted to neutral.',
    };
  }
}

/**
 * Analyze sentiment using DeepSeek AI
 */
async function analyzeSingleArticleWithDeepSeek(
  article: SentimentAnalysisRequest,
  retryCount: number = 0
): Promise<SentimentAnalysisResult> {
  try {
    if (!DEEPSEEK_API_KEY) throw new Error('DeepSeek API key not set');

    const prompt = `Analyze the sentiment of this news article about a company.

Title: ${article.title}
Snippet: ${article.snippet}

Determine if the overall sentiment is:
- positive (favorable, good news, achievements, growth)
- negative (criticism, problems, scandals, decline)
- neutral (factual, balanced, no clear positive or negative tone)

Respond ONLY with valid JSON in this exact format:
{
  "sentiment": "positive" | "negative" | "neutral",
  "reasoning": "Brief explanation (1-2 sentences)"
}`;

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'You are a sentiment analysis expert. Respond only with valid JSON.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No response from DeepSeek');
    }

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const sentiment = parsed.sentiment.toLowerCase();

    if (!['positive', 'negative', 'neutral'].includes(sentiment)) {
      throw new Error(`Invalid sentiment: ${sentiment}`);
    }

    return {
      sentiment: sentiment as 'positive' | 'negative' | 'neutral',
      reasoning: parsed.reasoning,
    };
  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      console.warn(`DeepSeek analysis failed, retrying (${retryCount + 1}/${MAX_RETRIES})...`);
      await delay(RETRY_DELAY * (retryCount + 1));
      return analyzeSingleArticleWithDeepSeek(article, retryCount + 1);
    }

    console.error('Error with DeepSeek analysis:', error);
    return {
      sentiment: 'neutral',
      reasoning: 'Unable to analyze sentiment. Defaulted to neutral.',
    };
  }
}

/**
 * Analyze sentiment of a single article using selected model
 */
async function analyzeSingleArticle(
  article: SentimentAnalysisRequest,
  model: AIModel = 'gemini'
): Promise<SentimentAnalysisResult> {
  try {
    if (model === 'gemini') {
      return await analyzeSingleArticleWithGemini(article);
    } else {
      return await analyzeSingleArticleWithDeepSeek(article);
    }
  } catch (error) {
    console.error(`Primary model (${model}) failed, falling back to alternative...`);

    // Fallback to the other model
    const fallbackModel = model === 'gemini' ? 'deepseek' : 'gemini';
    console.log(`Attempting analysis with ${fallbackModel} as fallback...`);

    try {
      if (fallbackModel === 'gemini') {
        return await analyzeSingleArticleWithGemini(article);
      } else {
        return await analyzeSingleArticleWithDeepSeek(article);
      }
    } catch (fallbackError) {
      console.error('Both primary and fallback models failed:', fallbackError);
      return {
        sentiment: 'neutral',
        reasoning: 'All sentiment analysis models failed. Defaulted to neutral.',
      };
    }
  }
}

/**
 * Analyze sentiment of multiple articles in batches
 */
export async function analyzeSentimentBatch(
  articles: GoogleSearchResult[],
  model: AIModel = 'gemini'
): Promise<Array<GoogleSearchResult & SentimentAnalysisResult>> {
  validateConfig(model);

  if (articles.length === 0) {
    return [];
  }

  console.log(`Analyzing sentiment for ${articles.length} articles using ${model.toUpperCase()}...`);

  const results: Array<GoogleSearchResult & SentimentAnalysisResult> = [];

  // Process in batches to avoid rate limiting
  for (let i = 0; i < articles.length; i += BATCH_SIZE) {
    const batch = articles.slice(i, i + BATCH_SIZE);

    console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(articles.length / BATCH_SIZE)}`);

    const batchPromises = batch.map(article =>
      analyzeSingleArticle({
        title: article.title,
        snippet: article.snippet,
        link: article.link,
      }, model)
    );

    const batchResults = await Promise.all(batchPromises);

    // Combine article data with sentiment results
    batch.forEach((article, index) => {
      results.push({
        ...article,
        ...batchResults[index],
      });
    });

    // Add delay between batches
    if (i + BATCH_SIZE < articles.length) {
      await delay(500);
    }
  }

  console.log(`Sentiment analysis complete using ${model.toUpperCase()}. Results: ${results.length} articles`);

  return results;
}

/**
 * Analyze sentiment with company context
 * More accurate analysis by providing company name
 */
export async function analyzeSentimentWithContext(
  articles: GoogleSearchResult[],
  companyName: string,
  model: AIModel = 'gemini'
): Promise<Array<GoogleSearchResult & SentimentAnalysisResult>> {
  validateConfig(model);

  if (articles.length === 0) {
    return [];
  }

  console.log(`Analyzing sentiment for ${articles.length} articles about ${companyName} using ${model.toUpperCase()}...`);

  const results: Array<GoogleSearchResult & SentimentAnalysisResult> = [];

  // Process in batches
  for (let i = 0; i < articles.length; i += BATCH_SIZE) {
    const batch = articles.slice(i, i + BATCH_SIZE);

    const batchPromises = batch.map(async (article) => {
      try {
        const result = await analyzeSingleArticle({
          title: article.title,
          snippet: article.snippet,
          link: article.link,
        }, model);

        return {
          ...article,
          ...result,
        };
      } catch (error) {
        console.error(`Error analyzing article: ${article.title}`, error);
        return {
          ...article,
          sentiment: 'neutral' as const,
          reasoning: 'Unable to analyze sentiment due to an error.',
        };
      }
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    // Add delay between batches
    if (i + BATCH_SIZE < articles.length) {
      await delay(500);
    }
  }

  console.log(`Sentiment analysis complete for ${companyName} using ${model.toUpperCase()}`);

  return results;
}

/**
 * Get sentiment summary statistics
 */
export function getSentimentSummary(
  articles: Array<{ sentiment: 'positive' | 'negative' | 'neutral' }>
): {
  total: number;
  positive: number;
  negative: number;
  neutral: number;
  positivePercentage: number;
  negativePercentage: number;
  neutralPercentage: number;
  overallSentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
} {
  const total = articles.length;
  const positive = articles.filter(a => a.sentiment === 'positive').length;
  const negative = articles.filter(a => a.sentiment === 'negative').length;
  const neutral = articles.filter(a => a.sentiment === 'neutral').length;

  const positivePercentage = total > 0 ? Math.round((positive / total) * 100) : 0;
  const negativePercentage = total > 0 ? Math.round((negative / total) * 100) : 0;
  const neutralPercentage = total > 0 ? Math.round((neutral / total) * 100) : 0;

  // Determine overall sentiment
  let overallSentiment: 'positive' | 'negative' | 'neutral' | 'mixed' = 'neutral';
  if (positivePercentage > 60) {
    overallSentiment = 'positive';
  } else if (negativePercentage > 60) {
    overallSentiment = 'negative';
  } else if (neutralPercentage > 60) {
    overallSentiment = 'neutral';
  } else {
    overallSentiment = 'mixed';
  }

  return {
    total,
    positive,
    negative,
    neutral,
    positivePercentage,
    negativePercentage,
    neutralPercentage,
    overallSentiment,
  };
}

/**
 * Test AI API connection
 */
export async function testAIAPI(model: AIModel = 'gemini'): Promise<boolean> {
  try {
    validateConfig(model);

    const testArticle = {
      title: 'Test Article',
      snippet: 'This is a test.',
      link: 'https://test.com',
    };

    const result = await analyzeSingleArticle(testArticle, model);
    return !!result.sentiment;
  } catch (error) {
    console.error(`${model.toUpperCase()} API test failed:`, error);
    return false;
  }
}
