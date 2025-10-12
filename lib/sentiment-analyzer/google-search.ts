// ============================================================================
// GOOGLE CUSTOM SEARCH API SERVICE
// Enterprise-grade Google Search integration with error handling and retry logic
// ============================================================================

import { GoogleSearchResult, GoogleSearchResponse } from '@/types/sentiment-analyzer';

const GOOGLE_API_KEY = process.env.GOOGLE_SEARCH_API_KEY;
const GOOGLE_ENGINE_ID = process.env.GOOGLE_SEARCH_ENGINE_ID;
const GOOGLE_API_URL = 'https://www.googleapis.com/customsearch/v1';

// Search configuration
const MAX_RESULTS_PER_QUERY = 10;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

/**
 * Delay helper for retry logic
 */
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Validate environment variables
 */
function validateConfig(): void {
  if (!GOOGLE_API_KEY) {
    throw new Error('GOOGLE_SEARCH_API_KEY environment variable is not set');
  }
  if (!GOOGLE_ENGINE_ID) {
    throw new Error('GOOGLE_SEARCH_ENGINE_ID environment variable is not set');
  }
}

/**
 * Perform a single Google Custom Search query with retry logic
 */
async function performSearch(
  query: string,
  country: string = '',
  retryCount: number = 0
): Promise<GoogleSearchResult[]> {
  try {
    const params = new URLSearchParams({
      key: GOOGLE_API_KEY!,
      cx: GOOGLE_ENGINE_ID!,
      q: query,
      num: MAX_RESULTS_PER_QUERY.toString(),
    });

    // Only add country filter if specified (otherwise worldwide)
    if (country && country.trim()) {
      params.append('gl', country.toLowerCase());
    }

    const response = await fetch(`${GOOGLE_API_URL}?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      
      // Handle rate limiting with retry
      if (response.status === 429 && retryCount < MAX_RETRIES) {
        console.warn(`Rate limited, retrying in ${RETRY_DELAY * (retryCount + 1)}ms...`);
        await delay(RETRY_DELAY * (retryCount + 1));
        return performSearch(query, country, retryCount + 1);
      }
      
      throw new Error(`Google Search API error (${response.status}): ${errorText}`);
    }

    const data: GoogleSearchResponse = await response.json();
    
    if (!data.items || data.items.length === 0) {
      console.warn(`No results found for query: ${query}`);
      return [];
    }

    return data.items.map(item => ({
      title: item.title,
      link: item.link,
      snippet: item.snippet,
      displayLink: item.displayLink,
      formattedUrl: item.formattedUrl,
    }));
  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      console.warn(`Search failed, retrying (${retryCount + 1}/${MAX_RETRIES})...`, error);
      await delay(RETRY_DELAY * (retryCount + 1));
      return performSearch(query, country, retryCount + 1);
    }
    
    console.error('Google Search API error:', error);
    throw error;
  }
}

/**
 * Search for company sentiment articles
 * Performs 3 different searches to get diverse results:
 * 1. Company + news
 * 2. Company + reviews/opinions
 * 3. Company + recent developments
 */
export async function searchCompanySentiment(
  companyName: string,
  country: string = ''
): Promise<GoogleSearchResult[]> {
  validateConfig();

  try {
    // Define search queries for comprehensive coverage
    const queries = [
      `${companyName} news`,
      `${companyName} reviews opinions`,
      `${companyName} recent developments`,
    ];

    const location = country && country.trim() ? country.toUpperCase() : 'Worldwide';
    console.log(`Searching for: ${companyName} in: ${location}`);

    // Execute all searches in parallel
    const searchPromises = queries.map(query => 
      performSearch(query, country)
    );

    const results = await Promise.all(searchPromises);
    
    // Flatten and deduplicate results by URL
    const allResults = results.flat();
    const uniqueResults = Array.from(
      new Map(allResults.map(item => [item.link, item])).values()
    );

    console.log(`Found ${uniqueResults.length} unique articles for ${companyName}`);

    return uniqueResults;
  } catch (error) {
    console.error('Error searching company sentiment:', error);
    throw new Error(`Failed to search for company sentiment: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Search with custom query
 * Allows for more specific searches
 */
export async function searchCustomQuery(
  query: string,
  country: string = ''
): Promise<GoogleSearchResult[]> {
  validateConfig();

  try {
    const location = country && country.trim() ? country.toUpperCase() : 'Worldwide';
    console.log(`Custom search: ${query} in ${location}`);
    const results = await performSearch(query, country);
    console.log(`Found ${results.length} results`);
    return results;
  } catch (error) {
    console.error('Error performing custom search:', error);
    throw new Error(`Failed to perform custom search: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Batch search for multiple companies
 * Useful for bulk analysis
 */
export async function batchSearchCompanies(
  companies: string[],
  country: string = ''
): Promise<Map<string, GoogleSearchResult[]>> {
  validateConfig();

  const results = new Map<string, GoogleSearchResult[]>();

  for (const company of companies) {
    try {
      const companyResults = await searchCompanySentiment(company, country);
      results.set(company, companyResults);
      
      // Add delay between companies to avoid rate limiting
      if (companies.indexOf(company) < companies.length - 1) {
        await delay(500);
      }
    } catch (error) {
      console.error(`Error searching for ${company}:`, error);
      results.set(company, []);
    }
  }

  return results;
}

/**
 * Test Google Search API connection
 */
export async function testGoogleSearchAPI(): Promise<boolean> {
  try {
    validateConfig();
    const results = await performSearch('test query', '');
    return results.length >= 0; // Even 0 results means API is working
  } catch (error) {
    console.error('Google Search API test failed:', error);
    return false;
  }
}
