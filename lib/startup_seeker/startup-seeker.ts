import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import { getDb } from '../../utils/dbConfig';
import { AgritechStartups } from '../../utils/schema';
import { eq, and, gte, lte, ilike, or, desc, asc } from 'drizzle-orm';
import { aiStartupScrapingService } from './ai-startup-scraper';
import { traditionalStartupScrapingService } from './traditional-startup-scraper';

/**
 * Unified interface for scraped startup data from both AI and traditional sources
 */
export interface ScrapedStartupData {
  name: string;
  website: string;
  description: string;
  city?: string;
  country?: string;
  location?: {
    city: string;
    country: string;
  };
  industry?: string;
  hasFunding?: boolean;
  fundingAmount?: string;
  foundedYear?: number;
  employeeCount?: string;
  linkedinUrl?: string;
  qualityScore?: number;
  verified?: boolean;
  sources?: string[];
  dataSource?: string;
}

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
    count: number = 10,
    mode: 'traditional' | 'ai' | 'hybrid' = 'hybrid'
  ): Promise<StartupData[]> {
    const startTime = Date.now();
    
    try {
      // Validate inputs
      if (!userId || count < 1 || count > 100) {
        throw new Error('Invalid parameters: userId required, count must be 1-100');
      }

      console.log(`🔍 Starting startup generation for user ${userId}:`);
      console.log(`   • Count: ${count} startups`);
      console.log(`   • Mode: ${mode}`);
      console.log(`   • Timestamp: ${new Date().toISOString()}`);

      const db = getDb();

      // Get existing startups for this user to avoid duplicates
      const existingStartups = await db
        .select({ name: AgritechStartups.name })
        .from(AgritechStartups)
        .where(eq(AgritechStartups.userId, userId));

      const existingNames = existingStartups.map((s: { name: string }) => s.name);
      console.log(`� Found ${existingNames.length} existing startups for user`);

      let scrapedData: any[] = [];
      const targetCount = Math.min(count * 2, 50); // Get more data for better filtering

      if (mode === 'ai') {
        console.log(`🤖 Using AI-powered startup discovery (${targetCount} targets)`);
        const result = await aiStartupScrapingService.extractStartups(targetCount, 'Global', 'ai');
        if (result.success) {
          scrapedData = result.data;
          console.log(`✅ AI extraction: ${scrapedData.length} startups discovered`);
        } else {
          console.warn('⚠️ AI extraction failed, falling back to traditional');
          const fallbackResult = await traditionalStartupScrapingService.extractStartups('Global', targetCount, true);
          if (fallbackResult.success) scrapedData = fallbackResult.data;
        }
      } else if (mode === 'traditional') {
        console.log(`🌐 Using traditional web scraping (${targetCount} targets)`);
        const result = await traditionalStartupScrapingService.extractStartups('Global', targetCount, true);
        if (result.success) {
          scrapedData = result.data;
          console.log(`✅ Traditional extraction: ${scrapedData.length} startups discovered`);
        } else {
          throw new Error('Traditional scraping failed and no fallback available');
        }
      } else {
        // Hybrid mode: Combine AI and traditional for maximum reliability
        console.log(`⚡ Using hybrid AI + Traditional processing (${targetCount} targets)`);
        
        const aiCount = Math.ceil(targetCount * 0.6); // 60% from AI
        const traditionalCount = targetCount - aiCount; // 40% from traditional
        
        // Phase 1: AI extraction (faster, broader coverage)
        console.log(`🤖 Phase 1: AI extraction (${aiCount} startups)`);
        const aiResult = await aiStartupScrapingService.extractStartups(aiCount, 'Global', 'ai');
        
        // Phase 2: Traditional extraction (higher accuracy)
        console.log(`🌐 Phase 2: Traditional extraction (${traditionalCount} startups)`);
        const traditionalResult = await traditionalStartupScrapingService.extractStartups('Global', traditionalCount, true);
        
        // Combine results
        const aiData = aiResult.success ? aiResult.data : [];
        const traditionalData = traditionalResult.success ? traditionalResult.data : [];
        
        console.log(`📊 AI yielded ${aiData.length} startups, Traditional yielded ${traditionalData.length} startups`);
        
        // Convert traditional data to match AI format for compatibility
        const enhancedTraditionalData = traditionalData.map((traditional: any) => ({
          ...traditional,
          confidence: traditional.qualityScore / 100,
          lastVerified: new Date().toISOString(),
          processingMethod: 'traditional-enhanced' as const,
        }));
        
        // Deduplicate and merge
        const combinedData = [...aiData];
        const existingNamesSet = new Set(aiData.map((s: any) => s.name.toLowerCase()));
        
        for (const traditional of enhancedTraditionalData) {
          if (!existingNamesSet.has(traditional.name.toLowerCase())) {
            combinedData.push(traditional);
          }
        }
        
        scrapedData = combinedData;
        console.log(`✅ Hybrid processing: ${aiData.length} AI + ${traditionalData.length} traditional = ${scrapedData.length} total`);
      }

      // Convert scraped data to StartupData format and validate agritech focus
      console.log(`🔄 Processing and validating ${scrapedData.length} discovered startups...`);
      const convertedStartups = this.convertScrapedToStartupData(scrapedData, existingNames)
        .filter(startup => this.isAgritechStartup(startup));

      console.log(`📊 After conversion and validation: ${convertedStartups.length} agritech startups`);

      if (convertedStartups.length === 0) {
        throw new Error(`No valid agritech startups found using ${mode} mode. Try a different mode or check your filters.`);
      }

      // Sort by quality and take the best ones
      const finalStartups = convertedStartups
        .sort((a, b) => b.rougeScore - a.rougeScore)
        .slice(0, count);

      const processingTime = Date.now() - startTime;
      console.log(`✅ Startup generation completed successfully:`);
      console.log(`   • Generated: ${finalStartups.length}/${count} requested startups`);
      console.log(`   • Mode: ${mode}`);
      console.log(`   • Processing time: ${processingTime}ms`);
      console.log(`   • Average quality score: ${Math.round(finalStartups.reduce((sum, s) => sum + s.rougeScore, 0) / finalStartups.length)}`);

      return finalStartups;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error(`❌ Startup generation failed after ${processingTime}ms:`, error);
      throw new Error(`Failed to generate startup data using ${mode} mode: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Convert scraped startup data to StartupData format
   */
  private convertScrapedToStartupData(scrapedData: any[], existingNames: string[]): StartupData[] {
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
          city: scraped.city || scraped.location?.city || 'Bangkok',
          website: scraped.website,
          description: scraped.description || `${scraped.name} is an agritech startup focused on agricultural innovation.`,
          locationScore: this.calculateLocationScore(scraped.city || scraped.location?.city, scraped.country),
          readinessScore: this.calculateReadinessScore(scraped),
          feasibilityScore: this.calculateFeasibilityScore(scraped.description),
          rougeScore: scraped.qualityScore || this.calculateOverallScore(scraped),
          justification: `Real-world startup from ${scraped.country || 'web scraping'} (${scraped.dataSource || 'scraped'})`,
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
    const qualityScore = scraped.qualityScore || 70;
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
      maxScore?: number;
      isPriority?: boolean;
      limit?: number;
      offset?: number;
      sortBy?: 'score' | 'date' | 'name' | 'city';
      order?: 'asc' | 'desc';
      search?: string;
      city?: string;
    }
  ): Promise<StartupData[]> {
    try {
      const db = getDb();

      const conditions = [eq(AgritechStartups.userId, userId)];

      if (filters?.isPriority !== undefined) {
        conditions.push(eq(AgritechStartups.isPriority, filters.isPriority));
      }

      if (typeof filters?.minScore === 'number') {
        conditions.push(gte(AgritechStartups.rougeScore, filters.minScore));
      }

      if (typeof filters?.maxScore === 'number') {
        conditions.push(lte(AgritechStartups.rougeScore, filters.maxScore));
      }

      if (filters?.city) {
        conditions.push(eq(AgritechStartups.city, filters.city));
      }

      if (filters?.search) {
        const likeTerm = `%${filters.search}%`;
        const searchCondition = or(
          ilike(AgritechStartups.name, likeTerm),
          ilike(AgritechStartups.description, likeTerm)
        );
        if (searchCondition) {
          conditions.push(searchCondition as any);
        }
      }

      const whereExpr = conditions.length ? and(...(conditions.filter(Boolean) as any)) : undefined;

      let query = db
        .select()
        .from(AgritechStartups);
      if (whereExpr) {
        // @ts-expect-error drizzle typing for where
        query = query.where(whereExpr as any);
      }

      // Sorting
      if (filters?.sortBy) {
        const sortCol = (() => {
          switch (filters.sortBy) {
            case 'score':
              return AgritechStartups.rougeScore;
            case 'date':
              return AgritechStartups.createdAt;
            case 'name':
              return AgritechStartups.name;
            case 'city':
              return AgritechStartups.city;
            default:
              return AgritechStartups.createdAt;
          }
        })();
        // @ts-expect-error drizzle typing on orderBy union
        query = query.orderBy(filters.order === 'asc' ? asc(sortCol) : desc(sortCol));
      }

      if (filters?.limit) {
        query = query.limit(filters.limit) as any;
      }

      if (typeof filters?.offset === 'number' && filters.offset > 0) {
        // @ts-expect-error drizzle typing for offset
        query = query.offset(filters.offset);
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
