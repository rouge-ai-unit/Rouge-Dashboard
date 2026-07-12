// ============================================================================
// CONTACT FINDER — PERPLEXITY AI CLIENT
// Handles communication with the Perplexity AI API for web search
// ============================================================================

/**
 * Response structure from the Perplexity AI search.
 */
export interface PerplexityResponse {
  /** The raw text content from the AI response */
  text: string;
  /** Array of citation URLs from Perplexity's web search */
  citations: string[];
}

/**
 * Sends a search prompt to the Perplexity AI API and returns the response.
 *
 * Uses the `sonar` model which has built-in
 * web search capabilities, allowing it to find and cite real-time information.
 *
 * @param prompt - The search prompt to send to Perplexity
 * @returns      - Object containing the response text and citation URLs
 * @throws       - Throws an error if the API key is missing or the request fails
 *
 * API Documentation: https://docs.perplexity.ai/reference/post_chat_completions
 */
export async function searchWithPerplexity(prompt: string): Promise<PerplexityResponse> {
  const apiKey = process.env.PERPLEXITY_API_KEY;

  if (!apiKey) {
    throw new Error(
      'PERPLEXITY_API_KEY is not configured. ' +
      'Please add your Perplexity API key to .env.local'
    );
  }

  const requestBody = {
    model: 'sonar',
    messages: [
      {
        role: 'system',
        content:
          'You are a professional contact research assistant. ' +
          'Search public sources thoroughly and return structured, accurate information. ' +
          'Always include source URLs for verification. ' +
          'Never fabricate or guess contact information.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    return_citations: true,
    temperature: 0.1, // Low temperature for more factual, deterministic responses
  };

  console.log('[Perplexity] Sending search request...');

  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Perplexity] API error:', response.status, errorText);

    if (response.status === 401) {
      throw new Error('Invalid Perplexity API key. Please check your PERPLEXITY_API_KEY.');
    }
    if (response.status === 429) {
      throw new Error('Perplexity API rate limit exceeded. Please try again later.');
    }

    throw new Error(`Perplexity API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();

  // Extract the response text from the API response
  const text = data.choices?.[0]?.message?.content ?? '';
  
  // Extract citations array from the response
  const citations: string[] = data.citations ?? [];

  console.log(`[Perplexity] Received response: ${text.length} chars, ${citations.length} citations`);

  return { text, citations };
}
