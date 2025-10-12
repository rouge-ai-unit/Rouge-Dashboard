// ============================================================================
// SENTIMENT ANALYZER TYPES
// ============================================================================

export interface SentimentArticle {
  id: string;
  companyQuery: string;
  descriptionQuery?: string;
  title: string;
  link: string;
  snippet?: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  reasoning: string;
  userId: string;
  createdAt: Date;
}

export interface SentimentSearchHistory {
  id: string;
  companyQuery: string;
  userId: string;
  resultsCount: number;
  createdAt: Date;
}

export interface SentimentApiUsage {
  id: string;
  userId: string;
  date: string;
  count: number;
  resetAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// API Request/Response Types
export interface SearchSentimentRequest {
  companyQuery: string;
  country?: string;
  aiModel?: 'gemini' | 'deepseek';
}

export interface SearchSentimentResponse {
  success: boolean;
  articles: SentimentArticle[];
  count: number;
  message?: string;
}

export interface GetResultsRequest {
  company: string;
  page?: number;
  limit?: number;
}

export interface GetResultsResponse {
  success: boolean;
  articles: SentimentArticle[];
  total: number;
  page: number;
  limit: number;
}

export interface GetHistoryRequest {
  search_query?: string;
  limit?: number;
}

export interface GetHistoryResponse {
  success: boolean;
  history: SentimentSearchHistory[];
}

export interface GetUsageResponse {
  success: boolean;
  count: number;
  limit: number;
  resetAt: string;
  remaining: number;
}

// Google Search API Types
export interface GoogleSearchResult {
  title: string;
  link: string;
  snippet: string;
  displayLink?: string;
  formattedUrl?: string;
}

export interface GoogleSearchResponse {
  items?: GoogleSearchResult[];
  searchInformation?: {
    totalResults: string;
    searchTime: number;
  };
}

// OpenAI Sentiment Analysis Types
export interface SentimentAnalysisRequest {
  title: string;
  snippet: string;
  link: string;
}

export interface SentimentAnalysisResult {
  sentiment: 'positive' | 'negative' | 'neutral';
  reasoning: string;
  confidence?: number;
}

// Database Query Types
export interface ArticleFilters {
  companyQuery?: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
  userId: string;
  startDate?: Date;
  endDate?: Date;
}

export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: 'createdAt' | 'sentiment';
  sortOrder?: 'asc' | 'desc';
}

// Error Types
export interface SentimentAnalyzerError {
  code: string;
  message: string;
  details?: any;
}

// Constants
export const SENTIMENT_DAILY_LIMIT = 100;
export const SENTIMENT_CACHE_TTL = 3600; // 1 hour in seconds
export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 50;

// Sentiment Color Mapping
export const SENTIMENT_COLORS = {
  positive: 'bg-green-100 text-green-800 border-green-300',
  negative: 'bg-red-100 text-red-800 border-red-300',
  neutral: 'bg-gray-100 text-gray-800 border-gray-300',
} as const;

export const SENTIMENT_ICONS = {
  positive: '😊',
  negative: '😞',
  neutral: '😐',
} as const;
