// ============================================================================
// SENTIMENT ANALYZER DATABASE OPERATIONS
// Enterprise-grade database layer with Drizzle ORM
// ============================================================================

import { getDb } from '@/utils/dbConfig';

const db = getDb();
import { 
  SentimentArticles, 
  SentimentSearchHistory, 
  SentimentApiUsage 
} from '@/utils/schema';
import { 
  SentimentArticle, 
  SentimentSearchHistory as SearchHistory,
  SentimentApiUsage as ApiUsage,
  ArticleFilters,
  PaginationOptions,
  SENTIMENT_DAILY_LIMIT
} from '@/types/sentiment-analyzer';
import { eq, and, desc, sql, gte, lte } from 'drizzle-orm';

// ============================================================================
// ARTICLE OPERATIONS
// ============================================================================

/**
 * Save multiple articles to database
 * Updates existing articles if link already exists
 */
export async function saveArticles(articles: Omit<SentimentArticle, 'id' | 'createdAt'>[]): Promise<SentimentArticle[]> {
  try {
    const result = await db
      .insert(SentimentArticles)
      .values(articles)
      .onConflictDoUpdate({
        target: SentimentArticles.link,
        set: {
          sentiment: sql`excluded.sentiment`,
          reasoning: sql`excluded.reasoning`,
          companyQuery: sql`excluded.company_query`,
          descriptionQuery: sql`excluded.description_query`,
          title: sql`excluded.title`,
          snippet: sql`excluded.snippet`,
        },
      })
      .returning();
    
    return result as SentimentArticle[];
  } catch (error) {
    console.error('Error saving articles:', error);
    throw new Error('Failed to save articles to database');
  }
}

/**
 * Get articles by company query with pagination
 */
export async function getArticlesByCompany(
  companyQuery: string,
  userId: string,
  options: PaginationOptions = { page: 1, limit: 10 }
): Promise<{ articles: SentimentArticle[]; total: number }> {
  try {
    const offset = (options.page - 1) * options.limit;
    
    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(SentimentArticles)
      .where(
        and(
          eq(SentimentArticles.companyQuery, companyQuery),
          eq(SentimentArticles.userId, userId)
        )
      );
    
    const total = Number(countResult[0]?.count || 0);
    
    // Get paginated articles
    const articles = await db
      .select()
      .from(SentimentArticles)
      .where(
        and(
          eq(SentimentArticles.companyQuery, companyQuery),
          eq(SentimentArticles.userId, userId)
        )
      )
      .orderBy(desc(SentimentArticles.createdAt))
      .limit(options.limit)
      .offset(offset);
    
    return { articles: articles as SentimentArticle[], total };
  } catch (error) {
    console.error('Error fetching articles:', error);
    throw new Error('Failed to fetch articles from database');
  }
}

/**
 * Get articles with advanced filtering
 */
export async function getArticlesWithFilters(
  filters: ArticleFilters,
  options: PaginationOptions = { page: 1, limit: 10 }
): Promise<{ articles: SentimentArticle[]; total: number }> {
  try {
    const conditions = [eq(SentimentArticles.userId, filters.userId)];
    
    if (filters.companyQuery) {
      conditions.push(eq(SentimentArticles.companyQuery, filters.companyQuery));
    }
    
    if (filters.sentiment) {
      conditions.push(eq(SentimentArticles.sentiment, filters.sentiment));
    }
    
    if (filters.startDate) {
      conditions.push(gte(SentimentArticles.createdAt, filters.startDate));
    }
    
    if (filters.endDate) {
      conditions.push(lte(SentimentArticles.createdAt, filters.endDate));
    }
    
    const offset = (options.page - 1) * options.limit;
    
    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(SentimentArticles)
      .where(and(...conditions));
    
    const total = Number(countResult[0]?.count || 0);
    
    // Get paginated articles
    const articles = await db
      .select()
      .from(SentimentArticles)
      .where(and(...conditions))
      .orderBy(desc(SentimentArticles.createdAt))
      .limit(options.limit)
      .offset(offset);
    
    return { articles: articles as SentimentArticle[], total };
  } catch (error) {
    console.error('Error fetching articles with filters:', error);
    throw new Error('Failed to fetch articles from database');
  }
}

// ============================================================================
// SEARCH HISTORY OPERATIONS
// ============================================================================

/**
 * Save search history entry
 */
export async function saveSearchHistory(
  companyQuery: string,
  userId: string,
  resultsCount: number
): Promise<SearchHistory> {
  try {
    const result = await db
      .insert(SentimentSearchHistory)
      .values({
        companyQuery,
        userId,
        resultsCount,
      })
      .returning();
    
    return result[0] as SearchHistory;
  } catch (error) {
    console.error('Error saving search history:', error);
    throw new Error('Failed to save search history');
  }
}

/**
 * Get user's search history
 */
export async function getSearchHistory(
  userId: string,
  searchQuery?: string,
  limit: number = 20
): Promise<SearchHistory[]> {
  try {
    const conditions = [eq(SentimentSearchHistory.userId, userId)];
    
    if (searchQuery) {
      conditions.push(sql`${SentimentSearchHistory.companyQuery} ILIKE ${`%${searchQuery}%`}`);
    }
    
    const history = await db
      .select()
      .from(SentimentSearchHistory)
      .where(and(...conditions))
      .orderBy(desc(SentimentSearchHistory.createdAt))
      .limit(limit);
    
    return history as SearchHistory[];
  } catch (error) {
    console.error('Error fetching search history:', error);
    throw new Error('Failed to fetch search history');
  }
}

/**
 * Get recent unique searches
 */
export async function getRecentSearches(userId: string, limit: number = 10): Promise<string[]> {
  try {
    const result = await db
      .selectDistinct({ companyQuery: SentimentSearchHistory.companyQuery })
      .from(SentimentSearchHistory)
      .where(eq(SentimentSearchHistory.userId, userId))
      .orderBy(desc(SentimentSearchHistory.createdAt))
      .limit(limit);
    
    return result.map((r: any) => r.companyQuery);
  } catch (error) {
    console.error('Error fetching recent searches:', error);
    throw new Error('Failed to fetch recent searches');
  }
}

// ============================================================================
// API USAGE OPERATIONS
// ============================================================================

/**
 * Get or create today's usage record for user
 */
export async function getTodayUsage(userId: string): Promise<ApiUsage> {
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    // Try to get existing record
    const existing = await db
      .select()
      .from(SentimentApiUsage)
      .where(
        and(
          eq(SentimentApiUsage.userId, userId),
          eq(SentimentApiUsage.date, today)
        )
      )
      .limit(1);
    
    if (existing.length > 0) {
      return existing[0] as ApiUsage;
    }
    
    // Create new record for today
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const result = await db
      .insert(SentimentApiUsage)
      .values({
        userId,
        date: today,
        count: 0,
        resetAt: tomorrow,
      })
      .returning();
    
    return result[0] as ApiUsage;
  } catch (error) {
    console.error('Error getting today usage:', error);
    throw new Error('Failed to get API usage');
  }
}

/**
 * Increment usage count for today
 */
export async function incrementUsage(userId: string): Promise<ApiUsage> {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Get or create today's record
    const usage = await getTodayUsage(userId);
    
    // Increment count
    const result = await db
      .update(SentimentApiUsage)
      .set({
        count: sql`${SentimentApiUsage.count} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(SentimentApiUsage.id, usage.id))
      .returning();
    
    return result[0] as ApiUsage;
  } catch (error) {
    console.error('Error incrementing usage:', error);
    throw new Error('Failed to increment API usage');
  }
}

/**
 * Check if user has reached daily limit
 */
export async function checkUsageLimit(userId: string): Promise<{ allowed: boolean; current: number; limit: number; resetAt: Date }> {
  try {
    const usage = await getTodayUsage(userId);
    
    return {
      allowed: usage.count < SENTIMENT_DAILY_LIMIT,
      current: usage.count,
      limit: SENTIMENT_DAILY_LIMIT,
      resetAt: usage.resetAt,
    };
  } catch (error) {
    console.error('Error checking usage limit:', error);
    throw new Error('Failed to check API usage limit');
  }
}

/**
 * Get usage statistics for user
 */
export async function getUsageStats(userId: string, days: number = 30): Promise<ApiUsage[]> {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];
    
    const stats = await db
      .select()
      .from(SentimentApiUsage)
      .where(
        and(
          eq(SentimentApiUsage.userId, userId),
          gte(SentimentApiUsage.date, startDateStr)
        )
      )
      .orderBy(desc(SentimentApiUsage.date));
    
    return stats as ApiUsage[];
  } catch (error) {
    console.error('Error fetching usage stats:', error);
    throw new Error('Failed to fetch usage statistics');
  }
}

// ============================================================================
// ANALYTICS & REPORTING
// ============================================================================

/**
 * Get sentiment distribution for a company
 */
export async function getSentimentDistribution(
  companyQuery: string,
  userId: string
): Promise<{ positive: number; negative: number; neutral: number }> {
  try {
    const result = await db
      .select({
        sentiment: SentimentArticles.sentiment,
        count: sql<number>`count(*)`,
      })
      .from(SentimentArticles)
      .where(
        and(
          eq(SentimentArticles.companyQuery, companyQuery),
          eq(SentimentArticles.userId, userId)
        )
      )
      .groupBy(SentimentArticles.sentiment);
    
    const distribution = {
      positive: 0,
      negative: 0,
      neutral: 0,
    };
    
    result.forEach((row: any) => {
      const sentiment = row.sentiment as 'positive' | 'negative' | 'neutral';
      distribution[sentiment] = Number(row.count);
    });
    
    return distribution;
  } catch (error) {
    console.error('Error getting sentiment distribution:', error);
    throw new Error('Failed to get sentiment distribution');
  }
}

/**
 * Get total articles analyzed by user
 */
export async function getTotalArticlesAnalyzed(userId: string): Promise<number> {
  try {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(SentimentArticles)
      .where(eq(SentimentArticles.userId, userId));
    
    return Number(result[0]?.count || 0);
  } catch (error) {
    console.error('Error getting total articles:', error);
    throw new Error('Failed to get total articles count');
  }
}

// ============================================================================
// CLEANUP OPERATIONS
// ============================================================================

/**
 * Clear all search history for a user
 */
export async function clearSearchHistory(userId: string): Promise<number> {
  try {
    const result = await db
      .delete(SentimentSearchHistory)
      .where(eq(SentimentSearchHistory.userId, userId))
      .returning();
    
    return result.length;
  } catch (error) {
    console.error('Error clearing search history:', error);
    throw new Error('Failed to clear search history');
  }
}

/**
 * Clear articles older than specified days
 */
export async function clearOldArticles(userId: string, daysOld: number = 30): Promise<number> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    const result = await db
      .delete(SentimentArticles)
      .where(
        and(
          eq(SentimentArticles.userId, userId),
          lte(SentimentArticles.createdAt, cutoffDate)
        )
      )
      .returning();
    
    return result.length;
  } catch (error) {
    console.error('Error clearing old articles:', error);
    throw new Error('Failed to clear old articles');
  }
}

/**
 * Clear all articles for a specific company query
 */
export async function clearCompanyArticles(userId: string, companyQuery: string): Promise<number> {
  try {
    const result = await db
      .delete(SentimentArticles)
      .where(
        and(
          eq(SentimentArticles.userId, userId),
          eq(SentimentArticles.companyQuery, companyQuery)
        )
      )
      .returning();
    
    return result.length;
  } catch (error) {
    console.error('Error clearing company articles:', error);
    throw new Error('Failed to clear company articles');
  }
}

/**
 * Auto-cleanup: Remove data older than 90 days (scheduled task)
 */
export async function autoCleanupOldData(): Promise<{ articles: number; history: number }> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90);
    
    // Delete old articles
    const articlesResult = await db
      .delete(SentimentArticles)
      .where(lte(SentimentArticles.createdAt, cutoffDate))
      .returning();
    
    // Delete old search history
    const historyResult = await db
      .delete(SentimentSearchHistory)
      .where(lte(SentimentSearchHistory.createdAt, cutoffDate))
      .returning();
    
    console.log(`[Auto Cleanup] Removed ${articlesResult.length} articles and ${historyResult.length} history entries older than 90 days`);
    
    return {
      articles: articlesResult.length,
      history: historyResult.length,
    };
  } catch (error) {
    console.error('Error in auto cleanup:', error);
    throw new Error('Failed to auto cleanup old data');
  }
}
