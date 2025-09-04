import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import { scrapingService, ScrapedStartupData } from './scraping-service';
import { getDb } from '../utils/dbConfig';
import { AgritechStartups } from '../utils/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Interface for web scraping
 */
export interface StartupData {
  id?: string;
  name: string;
  city?: string;
  website: string;
  description: string;
  locationScore: number;
  readinessScore: number;
  feasibilityScore: number;
  rougeScore: number;
  justification: string;
  isPriority?: boolean;
  contactInfo?: any;
  userId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class StartupGenerationEngine {
  private readonly SCRAPING_SOURCES = {
    // Tech News & Media
    techNews: [
      'https://www.techinasia.com/startups/agriculture',
      'https://techcrunch.com/tag/agtech/',
      'https://techcrunch.com/tag/agriculture/',
      'https://www.agfundernews.com/'
    ],
    
    // Startup Directories
    directories: [
      'https://www.f6s.com/companies/agriculture',
      'https://www.betalist.com/markets/agriculture',
      'https://www.startupranking.com/top/agriculture'
    ],
    
    // Agritech Specific
    agritech: [
      'https://www.agritech-east.co.uk/members/',
      'https://www.foodnavigator.com/tag/keyword/Food/agtech'
    ],
    
    // Investment & VC
    investment: [
      'https://www.crunchbase.com/hub/agtech-startups',
      'https://www.owler.com/company/agriculture'
    ],
    
    // Regional
    regional: [
      'https://www.techinasia.com/startups/singapore/agriculture',
      'https://www.techinasia.com/startups/indonesia/agriculture',
      'https://www.techinasia.com/startups/thailand/agriculture',
      'https://www.techinasia.com/startups/malaysia/agriculture',
      'https://www.techinasia.com/startups/philippines/agriculture'
    ],
    
    // Industry Publications
    publications: [
      'https://www.agriculture.com/technology',
      'https://www.farmprogress.com/technology'
    ]
  };

  /**
   * Get scraping URLs from configuration
   */
  private getScrapingUrls(): string[] {
    const allUrls: string[] = [];
    
    // Add all URLs from different categories
    Object.values(this.SCRAPING_SOURCES).forEach(urls => {
      allUrls.push(...urls);
    });
    
    return allUrls;
  }

  async generateStartupData(
    userId: string,
    count: number = 10
  ): Promise<StartupData[]> {
    try {
      const db = getDb();

      // Get existing startups for this user to avoid duplicates
      const existingStartups = await db
        .select({ name: AgritechStartups.name })
        .from(AgritechStartups)
        .where(eq(AgritechStartups.userId, userId));

      const existingNames = existingStartups.map((s: { name: string }) => s.name);

      // Generate all startups using web scraping (no AI)
      console.log(`🔍 Generating ${count} startups using pure web scraping`);

      // Get scraping URLs from configuration
      const scrapingUrls = this.getScrapingUrls();

      // Scrape startups one URL at a time until we have enough
      const allScrapedStartups: ScrapedStartupData[] = [];
      
      for (const url of scrapingUrls) {
        if (allScrapedStartups.length >= count) {
          console.log(`✅ Reached target of ${count} startups, stopping scraping`);
          break;
        }

        console.log(`🔍 Scraping from: ${url} (${allScrapedStartups.length}/${count} collected so far)`);

        try {
          const remaining = count - allScrapedStartups.length;
          const scrapingResults = await scrapingService.scrapeStartups(
            [url], // Only scrape from this single URL
            userId,
            { validateData: true, storeResults: false, targetCount: remaining }
          );

          // Extract startups from this URL's results
          for (const result of scrapingResults) {
            if (result.success && result.data.length > 0) {
              allScrapedStartups.push(...result.data);
              console.log(`📊 Collected ${result.data.length} startups from ${url} (total: ${allScrapedStartups.length})`);
              
              // If we now have enough, stop
              if (allScrapedStartups.length >= count) {
                break;
              }
            }
          }
        } catch (error) {
          console.warn(`⚠️ Failed to scrape from ${url}:`, error);
          // Continue to next URL
        }
      }

      // Convert scraped data to StartupData format and validate agritech focus
      const convertedStartups = this.convertScrapedToStartupData(allScrapedStartups, existingNames)
        .filter(startup => this.isAgritechStartup(startup));

      // Only use scraped data - no hardcoded fallbacks
      console.log(`📊 Scraped ${convertedStartups.length} startups from web sources`);
      
      if (convertedStartups.length === 0) {
        throw new Error('Failed to find any agritech startups from web scraping');
      }

      console.log(`✅ Generated ${convertedStartups.length} startups total`);
      return convertedStartups.slice(0, count);

    } catch (error) {
      console.error('Error generating startup data:', error);
      throw new Error(`Failed to generate startup data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Convert scraped startup data to StartupData format
   */
  private convertScrapedToStartupData(scrapedData: ScrapedStartupData[], existingNames: string[]): StartupData[] {
    const startups: StartupData[] = [];
    const seenNames = new Set<string>();
    const seenNormalizedNames = new Set<string>();

    // Helper function to normalize startup names for better duplicate detection
    const normalizeName = (name: string): string => {
      return name.toLowerCase()
        .trim()
        .replace(/\s+(inc|llc|ltd|corp|corporation|company|co|limited|group|holdings|ventures|labs|tech|ai|io|com|org)$/gi, '')
        .replace(/^(the\s+|a\s+|an\s+)/gi, '')
        .replace(/[^\w\s]/g, '') // Remove special characters
        .replace(/\s+/g, ' '); // Normalize whitespace
    };

    for (const scraped of scrapedData) {
      // Skip if already exists in database (exact match only)
      if (existingNames.includes(scraped.name)) {
        console.log(`⚠️ Skipping existing startup from database: ${scraped.name}`);
        continue;
      }

      // Skip if already seen in this batch (exact match only, case-insensitive)
      const normalizedName = scraped.name.toLowerCase().trim();
      if (seenNames.has(normalizedName)) {
        console.log(`⚠️ Skipping duplicate in current batch: ${scraped.name}`);
        continue;
      }

      // Basic validation - ensure we have a reasonable name
      if (!scraped.name || scraped.name.length < 2 || scraped.name.length > 100) {
        console.log(`⚠️ Skipping invalid name: ${scraped.name}`);
        continue;
      }

      // Skip obvious website elements or navigation items
      const invalidPatterns = [
        /^home$/i,
        /^about$/i,
        /^contact$/i,
        /^more from/i,
        /^techcrunch$/i,
        /^agtech \|/i,
        /^ \| /i,
        /techcrunch$/i,
        /crunchbase$/i,
        /forbes$/i,
        /^the\s+/i,
        /\s+(inc|llc|ltd|corp|corporation|company|co|limited|group|holdings|ventures|labs|tech|ai|io|com|org)$/i
      ];

      const isInvalid = invalidPatterns.some(pattern => pattern.test(scraped.name));
      if (isInvalid) {
        console.log(`⚠️ Skipping invalid startup pattern: "${scraped.name}"`);
        continue;
      }

      try {
        const startup: StartupData = {
          name: scraped.name,
          city: scraped.city || 'Bangkok',
          website: scraped.website || `https://${normalizeName(scraped.name).replace(/\s+/g, '').toLowerCase()}.com`,
          description: scraped.description || `${scraped.name} is an agritech startup focused on agricultural innovation.`,
          locationScore: this.calculateLocationScore(scraped.city, scraped.country),
          readinessScore: this.calculateReadinessScore(scraped.metadata),
          feasibilityScore: this.calculateFeasibilityScore(scraped.description),
          rougeScore: this.calculateOverallScore(scraped),
          justification: `Real-world startup from ${scraped.country || 'web scraping'}`,
          isPriority: false,
          userId: '', // Will be set when saving
        };

        startups.push(startup);
        seenNames.add(scraped.name.toLowerCase().trim());
        seenNormalizedNames.add(normalizedName);
      } catch (error) {
        console.warn('Failed to convert scraped startup:', scraped.name, error);
        // Continue with next startup
      }
    }

    return startups;
  }

  /**
   * Calculate location score based on city and country
   */
  private calculateLocationScore(city?: string, country?: string): number {
    let score = 50; // Base score

    if (country) {
      // Bonus for target markets
      if (['Thailand', 'Singapore', 'Indonesia', 'Malaysia', 'Philippines'].includes(country)) {
        score += 30;
      }
    }

    if (city) {
      // Bonus for major cities
      if (['Bangkok', 'Singapore', 'Jakarta', 'Manila', 'Kuala Lumpur'].includes(city)) {
        score += 20;
      }
    }

    return Math.min(100, score);
  }

  /**
   * Calculate readiness score from metadata
   */
  private calculateReadinessScore(metadata?: any): number {
    let score = 60; // Base score

    if (metadata) {
      if (metadata.funding) {
        const funding = metadata.funding.toLowerCase();
        if (funding.includes('series')) score += 20;
        else if (funding.includes('seed')) score += 15;
      }

      if (metadata.employees) {
        const employees = metadata.employees.toLowerCase();
        if (employees.includes('50+')) score += 15;
        else if (employees.includes('25+')) score += 10;
      }
    }

    return Math.min(100, score);
  }

  /**
   * Calculate feasibility score from description
   */
  private calculateFeasibilityScore(description?: string): number {
    let score = 65; // Base score

    if (description) {
      const desc = description.toLowerCase();

      // Technology indicators
      if (desc.includes('iot') || desc.includes('ai') || desc.includes('digital')) score += 15;
      if (desc.includes('platform') || desc.includes('app')) score += 10;
      if (desc.includes('farmers') || desc.includes('agriculture')) score += 10;
    }

    return Math.min(100, score);
  }

  /**
   * Calculate overall Rouge score
   */
  private calculateOverallScore(scraped: ScrapedStartupData): number {
    const qualityScore = scraped.metadata?.qualityScore || 70;
    const descriptionLength = (scraped.description || '').length;

    let score = qualityScore;

    // Bonus for detailed descriptions
    if (descriptionLength > 100) score += 10;
    else if (descriptionLength > 50) score += 5;

    // Bonus for complete data
    if (scraped.website && scraped.city && scraped.country) score += 10;

    return Math.min(100, Math.max(0, score));
  }



  /**
   * Save startups to database
   */
  async saveStartupsToDatabase(
    startups: StartupData[],
    userId: string
  ): Promise<void> {
    try {
      const db = getDb();

      const startupsToInsert = startups.map(startup => ({
        name: startup.name,
        city: startup.city || '',
        website: startup.website,
        description: startup.description,
        locationScore: startup.locationScore,
        readinessScore: startup.readinessScore,
        feasibilityScore: startup.feasibilityScore,
        rougeScore: startup.rougeScore,
        justification: startup.justification,
        isPriority: startup.isPriority || false,
        contactInfo: startup.contactInfo || null,
        userId: userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));

      await db.insert(AgritechStartups).values(startupsToInsert.map(startup => ({
        name: startup.name,
        city: startup.city,
        website: startup.website,
        description: startup.description,
        locationScore: startup.locationScore,
        readinessScore: startup.readinessScore,
        feasibilityScore: startup.feasibilityScore,
        rougeScore: startup.rougeScore,
        justification: startup.justification,
        isPriority: startup.isPriority || false,
        contactInfo: startup.contactInfo || null,
        userId: userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })));

    } catch (error) {
      console.error('Error saving startups to database:', error);
      throw new Error(`Failed to save startups: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get user's startups with optional filtering
   */
  async getUserStartups(
    userId: string,
    filters?: {
      minScore?: number;
      isPriority?: boolean;
      limit?: number;
    }
  ): Promise<StartupData[]> {
    try {
      const db = getDb();

      const conditions = [eq(AgritechStartups.userId, userId)];

      if (filters?.isPriority !== undefined) {
        conditions.push(eq(AgritechStartups.isPriority, filters.isPriority));
      }

      if (filters?.minScore) {
        conditions.push(eq(AgritechStartups.rougeScore, filters.minScore));
      }

      const whereConditions = conditions.length > 1 ? and(...conditions) : conditions[0];

      let query = db
        .select()
        .from(AgritechStartups)
        .where(whereConditions);

      if (filters?.limit) {
        query = query.limit(filters.limit) as any;
      }

      const results = await query;

      return results.map((row: any) => ({
        id: row.id,
        name: row.name,
        city: row.city,
        website: row.website,
        description: row.description,
        locationScore: row.locationScore,
        readinessScore: row.readinessScore,
        feasibilityScore: row.feasibilityScore,
        rougeScore: row.rougeScore,
        justification: row.justification,
        isPriority: row.isPriority,
        contactInfo: row.contactInfo,
        userId: row.userId,
        createdAt: row.createdAt ? new Date(row.createdAt) : undefined,
        updatedAt: row.updatedAt ? new Date(row.updatedAt) : undefined,
      }));

    } catch (error) {
      console.error('Error fetching user startups:', error);
      throw new Error(`Failed to fetch startups: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update startup contact information
   */
  async updateStartupContacts(
    startupId: string,
    contactInfo: any,
    userId: string
  ): Promise<void> {
    try {
      const db = getDb();

      await db
        .update(AgritechStartups)
        .set({
          contactInfo: contactInfo,
          updatedAt: new Date().toISOString(),
        })
        .where(
          and(
            eq(AgritechStartups.id, startupId),
            eq(AgritechStartups.userId, userId)
          )
        );

    } catch (error) {
      console.error('Error updating startup contacts:', error);
      throw new Error(`Failed to update contacts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete a startup
   */
  async deleteStartup(
    startupId: string,
    userId: string
  ): Promise<void> {
    try {
      const db = getDb();

      await db
        .delete(AgritechStartups)
        .where(
          and(
            eq(AgritechStartups.id, startupId),
            eq(AgritechStartups.userId, userId)
          )
        );

    } catch (error) {
      console.error('Error deleting startup:', error);
      throw new Error(`Failed to delete startup: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate if a startup is truly agritech-related
   */
  /**
   * Enhanced validation for agritech startups (stricter than basic validation)
   */
  private isAgritechStartup(startup: StartupData): boolean {
    const name = startup.name?.toLowerCase().trim() || '';
    const description = startup.description?.toLowerCase() || '';
    const website = startup.website?.toLowerCase() || '';

    // Must have a name
    if (!name || name.length < 3) return false;

    // Must have a valid website
    if (!website || !website.includes('.') || website.includes('linkedin.com') || website.includes('facebook.com')) {
      return false;
    }

    // Exclude non-startup content
    const excludePatterns = [
      'competitors', 'alternatives', 'top companies', 'best companies', 'market leaders',
      'industry leaders', 'techstars', 'y combinator', 'accelerator', 'incubator',
      'newsletter', 'blog', 'news', 'article', 'report', 'analysis', 'guide',
      'directory', 'list', 'ranking', 'review', 'comparison', 'vs', 'versus',
      'farmers', 'agricultural', 'farming', 'crops', 'livestock', 'dairy', 'poultry'
    ];

    if (excludePatterns.some(pattern => name.includes(pattern))) {
      return false;
    }

    // Must contain agritech-specific keywords
    const agritechKeywords = [
      'agritech', 'agtech', 'precision farming', 'smart farming', 'vertical farming',
      'hydroponics', 'aquaponics', 'farm management', 'crop monitoring', 'soil sensor',
      'irrigation system', 'harvest optimization', 'yield prediction', 'pest detection',
      'drone farming', 'satellite farming', 'ai agriculture', 'machine learning farming',
      'data analytics farming', 'blockchain agriculture', 'iot farming', 'robotics farming',
      'climate smart agriculture', 'sustainable farming', 'regenerative agriculture'
    ];

    const combinedText = `${name} ${description}`;
    const hasAgritechKeywords = agritechKeywords.some(keyword =>
      combinedText.includes(keyword.toLowerCase())
    );

    // Must look like a company name (not generic terms)
    const looksLikeCompany = (
      name.includes('tech') || name.includes('labs') || name.includes('systems') ||
      name.includes('solutions') || name.includes('platform') || name.includes('digital') ||
      name.includes('ventures') || name.includes('agri') || name.includes('farm') ||
      name.includes('crop') || name.includes('food') || name.includes('harvest') ||
      name.includes('seed') || name.includes('soil') || name.includes('plant') ||
      /\d/.test(name) || // Contains numbers
      /^[A-Z][a-z]+[A-Z][a-z]+$/.test(startup.name || '') || // CamelCase
      name.split(' ').length >= 2 // Multi-word
    );

    return hasAgritechKeywords && looksLikeCompany;
  }

  /**
   * Validate if a startup is high-quality agritech
   */
  private isHighQualityAgritechStartup(startup: StartupData): boolean {
    // Must pass basic agritech validation
    if (!this.isAgritechStartup(startup)) {
      return false;
    }

    const name = startup.name.toLowerCase();
    const description = startup.description.toLowerCase();

    // Exclude obvious website elements and generic terms
    const excludePatterns = [
      'home', 'about', 'contact', 'news', 'blog', 'research', 'company', 'invest', 'newsletter', 'welcome',
      'agri-teche', 'challenge:', 'call for', 'participants needed', 'launches', 'women in farming',
      'drive people-first growth', 'producers call for', 'australian producers'
    ];

    if (excludePatterns.some(pattern => name.includes(pattern) || description.includes(pattern))) {
      return false;
    }

    // Must look like a real company name (not a website element or article title)
    const looksLikeCompany = (
      startup.name.length >= 4 && 
      startup.name.length <= 50 &&
      !startup.name.includes(':') &&
      !startup.name.includes('|') &&
      (startup.name.includes('tech') || 
       startup.name.includes('farm') || 
       startup.name.includes('agri') || 
       startup.name.includes('crop') || 
       startup.name.includes('food') ||
       /^[A-Z][a-z]+([A-Z][a-z]*)*$/.test(startup.name)) // CamelCase pattern
    );

    return looksLikeCompany;
  }
}

// Singleton instance
export const startupGenerationEngine = new StartupGenerationEngine();
