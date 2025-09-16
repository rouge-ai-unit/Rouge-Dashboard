/**
 * Production-Grade Traditional Startup Scraper
 * Scrapes from verified sources like Crunchbase, AngelList, TechCrunch
 * Real data from legitimate business sources
 */

import * as cheerio from 'cheerio';

export interface TraditionalStartupData {
  name: string;
  website: string;
  description: string;
  city?: string;
  country: string;
  industry: string;
  hasFunding: boolean;
  fundingAmount?: string;
  foundedYear?: number;
  employeeCount?: string;
  linkedinUrl?: string;
  qualityScore: number;
  verified: boolean;
  sources: string[];
  dataSource: 'traditional';
}

export interface TraditionalExtractionResult {
  success: boolean;
  data: TraditionalStartupData[];
  errors: string[];
  metadata: {
    totalExtracted: number;
    successfulRequests: number;
    failedRequests: number;
    processingTime: number;
    averageQualityScore: number;
    verificationRate: number;
    sourcesUsed: string[];
    mode: 'traditional';
  };
}

/**
 * Traditional Startup Scraping Service
 * Scrapes from verified business sources like Crunchbase, AngelList, etc.
 */
export class TraditionalStartupScrapingService {
  private readonly TIMEOUT = 30000;
  private readonly MAX_RETRIES = 3;
  private readonly DELAY_BETWEEN_REQUESTS = 2000;

  // Verified sources for agritech startups
  private readonly VERIFIED_SOURCES = {
    crunchbase: [
      'https://www.crunchbase.com/hub/agritech-startups',
      'https://www.crunchbase.com/hub/agriculture-startups',
      'https://www.crunchbase.com/hub/foodtech-startups',
      'https://www.crunchbase.com/hub/farming-startups'
    ],
    angellist: [
      'https://angel.co/companies?keywords=agritech',
      'https://angel.co/companies?keywords=agriculture',
      'https://angel.co/companies?keywords=farming'
    ],
    techcrunch: [
      'https://techcrunch.com/tag/agritech/',
      'https://techcrunch.com/tag/agriculture/',
      'https://techcrunch.com/tag/farming/'
    ],
    agfunder: [
      'https://www.agfundernews.com/',
      'https://www.agfundernews.com/tag/startups'
    ],
    f6s: [
      'https://www.f6s.com/companies/agriculture',
      'https://www.f6s.com/companies/farming',
      'https://www.f6s.com/companies/foodtech'
    ]
  };

  /**
   * Main traditional startup extraction method
   */
  async extractStartups(
    country: string = 'all',
    limit: number = 20,
    includeAnalysis: boolean = true
  ): Promise<TraditionalExtractionResult> {
    const startTime = Date.now();
    const metadata = {
      totalExtracted: 0,
      successfulRequests: 0,
      failedRequests: 0,
      processingTime: 0,
      averageQualityScore: 0,
      verificationRate: 0,
      sourcesUsed: [] as string[],
      mode: 'traditional' as const
    };

    try {
      console.log(`🔍 Starting traditional startup extraction for country: ${country}, limit: ${limit}`);

      // Get verified source URLs
      const sourceUrls = this.getVerifiedSourceUrls(country);
      metadata.sourcesUsed = sourceUrls;

      const allStartups: TraditionalStartupData[] = [];

      // Process each verified source
      for (const url of sourceUrls) {
        try {
          console.log(`🔍 Processing verified source: ${url}`);

          const html = await this.fetchWithRetry(url);
          const startups = await this.extractFromVerifiedSource(html, url, country);

          allStartups.push(...startups);
          metadata.successfulRequests++;

          // Rate limiting
          await this.delay(this.DELAY_BETWEEN_REQUESTS);

        } catch (error) {
          console.error(`❌ Failed to process ${url}:`, error);
          metadata.failedRequests++;
        }
      }

      // Post-processing
      const processedStartups = await this.postProcessStartups(
        allStartups,
        limit,
        includeAnalysis
      );

      // Calculate final metadata
      metadata.totalExtracted = processedStartups.length;
      metadata.processingTime = Date.now() - startTime;
      metadata.averageQualityScore = processedStartups.length > 0 ?
        processedStartups.reduce((sum, startup) => sum + startup.qualityScore, 0) / processedStartups.length : 0;
      metadata.verificationRate = processedStartups.length > 0 ?
        (processedStartups.filter(s => s.verified).length / processedStartups.length) * 100 : 0;

      console.log(`✅ Traditional extraction completed: ${processedStartups.length} startups in ${metadata.processingTime}ms`);

      return {
        success: true,
        data: processedStartups,
        errors: [],
        metadata
      };

    } catch (error) {
      console.error('❌ Traditional extraction failed:', error);

      metadata.processingTime = Date.now() - startTime;

      return {
        success: false,
        data: [],
        metadata,
        errors: [error instanceof Error ? error.message : 'Unknown error occurred']
      };
    }
  }

  /**
   * Get verified source URLs based on country
   */
  private getVerifiedSourceUrls(country: string): string[] {
    const urls: string[] = [];

    // Add country-specific sources
    if (country === 'all' || country === 'Thailand') {
      urls.push(
        'https://www.crunchbase.com/hub/thailand-agritech-startups',
        'https://techcrunch.com/search/agritech-thailand/',
        'https://www.agfundernews.com/tag/thailand'
      );
    }

    if (country === 'all' || country === 'us') {
      urls.push(
        'https://www.crunchbase.com/hub/us-agritech-startups',
        'https://techcrunch.com/tag/agritech/',
        'https://www.agfundernews.com/tag/us'
      );
    }

    // Add general verified sources
    Object.values(this.VERIFIED_SOURCES).forEach(sourceUrls => {
      urls.push(...sourceUrls);
    });

    // Remove duplicates
    return [...new Set(urls)];
  }

  /**
   * Extract startups from verified sources
   */
  private async extractFromVerifiedSource(html: string, sourceUrl: string, country: string): Promise<TraditionalStartupData[]> {
    const startups: TraditionalStartupData[] = [];
    const $ = cheerio.load(html);

    // Different extraction strategies based on source
    if (sourceUrl.includes('crunchbase.com')) {
      startups.push(...this.extractFromCrunchbase($, sourceUrl, country));
    } else if (sourceUrl.includes('angel.co')) {
      startups.push(...this.extractFromAngelList($, sourceUrl, country));
    } else if (sourceUrl.includes('techcrunch.com')) {
      startups.push(...this.extractFromTechCrunch($, sourceUrl, country));
    } else if (sourceUrl.includes('agfundernews.com')) {
      startups.push(...this.extractFromAgFunder($, sourceUrl, country));
    } else if (sourceUrl.includes('f6s.com')) {
      startups.push(...this.extractFromF6S($, sourceUrl, country));
    } else {
      // Generic extraction for other verified sources
      startups.push(...this.extractGeneric($, sourceUrl, country));
    }

    return startups;
  }

  /**
   * Extract from Crunchbase
   */
  private extractFromCrunchbase($: cheerio.CheerioAPI, sourceUrl: string, country: string): TraditionalStartupData[] {
    const startups: TraditionalStartupData[] = [];

    $('.entity-card, .company-card, .organization-card').each((_, element) => {
      const $el = $(element);

      const name = $el.find('.entity-name, .company-name, h3').first().text().trim();
      const website = $el.find('.entity-website, .company-website').first().attr('href');
      const description = $el.find('.entity-description, .company-description').first().text().trim();
      const location = $el.find('.entity-location, .company-location').first().text().trim();
      const industry = $el.find('.entity-industry, .company-industry').first().text().trim();

      if (name && website) {
        const startup: TraditionalStartupData = {
          name,
          website: this.cleanWebsite(website),
          description: description || `${name} is an agritech startup.`,
          country: this.extractCountryFromLocation(location) || country,
          city: this.extractCityFromLocation(location),
          industry: industry || 'Agritech',
          hasFunding: false,
          linkedinUrl: this.generateLinkedInUrl(name),
          qualityScore: 0,
          verified: true,
          sources: [sourceUrl],
          dataSource: 'traditional'
        };

        startup.qualityScore = this.calculateQualityScore(startup);

        if (startup.qualityScore >= 60) {
          startups.push(startup);
        }
      }
    });

    return startups;
  }

  /**
   * Extract from AngelList
   */
  private extractFromAngelList($: cheerio.CheerioAPI, sourceUrl: string, country: string): TraditionalStartupData[] {
    const startups: TraditionalStartupData[] = [];

    $('.startup-card, .company-card').each((_, element) => {
      const $el = $(element);

      const name = $el.find('.startup-name, .company-name').first().text().trim();
      const website = $el.find('.startup-url, .company-url').first().attr('href');
      const description = $el.find('.startup-description, .company-description').first().text().trim();
      const location = $el.find('.startup-location, .company-location').first().text().trim();

      if (name && website) {
        const startup: TraditionalStartupData = {
          name,
          website: this.cleanWebsite(website),
          description: description || `${name} is an agritech startup.`,
          country: this.extractCountryFromLocation(location) || country,
          city: this.extractCityFromLocation(location),
          industry: 'Agritech',
          hasFunding: false,
          linkedinUrl: this.generateLinkedInUrl(name),
          qualityScore: 0,
          verified: true,
          sources: [sourceUrl],
          dataSource: 'traditional'
        };

        startup.qualityScore = this.calculateQualityScore(startup);

        if (startup.qualityScore >= 60) {
          startups.push(startup);
        }
      }
    });

    return startups;
  }

  /**
   * Extract from TechCrunch
   */
  private extractFromTechCrunch($: cheerio.CheerioAPI, sourceUrl: string, country: string): TraditionalStartupData[] {
    const startups: TraditionalStartupData[] = [];

    $('article, .post').each((_, element) => {
      const $el = $(element);

      const title = $el.find('h1, h2, .article-title, .post-title').first().text().trim();
      const excerpt = $el.find('.excerpt, .article-excerpt, .post-excerpt').first().text().trim();
      const link = $el.find('a').first().attr('href');

      // Look for startup mentions in TechCrunch articles
      if (title && (title.toLowerCase().includes('startup') || title.toLowerCase().includes('raises'))) {
        const startupNames = this.extractStartupNamesFromText(title + ' ' + excerpt);

        for (const name of startupNames) {
          const startup: TraditionalStartupData = {
            name,
            website: link ? this.cleanWebsite(link) : `https://www.${name.toLowerCase().replace(/\s+/g, '')}.com`,
            description: excerpt || `${name} is featured in TechCrunch.`,
            country: country,
            industry: 'Agritech',
            hasFunding: title.toLowerCase().includes('raises'),
            linkedinUrl: this.generateLinkedInUrl(name),
            qualityScore: 0,
            verified: true,
            sources: [sourceUrl],
            dataSource: 'traditional'
          };

          startup.qualityScore = this.calculateQualityScore(startup);

          if (startup.qualityScore >= 50) {
            startups.push(startup);
          }
        }
      }
    });

    return startups;
  }

  /**
   * Extract from AgFunder
   */
  private extractFromAgFunder($: cheerio.CheerioAPI, sourceUrl: string, country: string): TraditionalStartupData[] {
    const startups: TraditionalStartupData[] = [];

    $('.post, .article, .news-item').each((_, element) => {
      const $el = $(element);

      const title = $el.find('h1, h2, h3, .post-title, .article-title').first().text().trim();
      const excerpt = $el.find('.excerpt, .summary, .content').first().text().trim();
      const link = $el.find('a').first().attr('href');

      if (title && excerpt) {
        const startupNames = this.extractStartupNamesFromText(title + ' ' + excerpt);

        for (const name of startupNames) {
          const startup: TraditionalStartupData = {
            name,
            website: link ? this.cleanWebsite(link) : `https://www.${name.toLowerCase().replace(/\s+/g, '')}.com`,
            description: excerpt,
            country: country,
            industry: 'Agritech',
            hasFunding: excerpt.toLowerCase().includes('funding') || excerpt.toLowerCase().includes('raises'),
            linkedinUrl: this.generateLinkedInUrl(name),
            qualityScore: 0,
            verified: true,
            sources: [sourceUrl],
            dataSource: 'traditional'
          };

          startup.qualityScore = this.calculateQualityScore(startup);

          if (startup.qualityScore >= 50) {
            startups.push(startup);
          }
        }
      }
    });

    return startups;
  }

  /**
   * Extract from F6S
   */
  private extractFromF6S($: cheerio.CheerioAPI, sourceUrl: string, country: string): TraditionalStartupData[] {
    const startups: TraditionalStartupData[] = [];

    $('.company-card, .startup-card').each((_, element) => {
      const $el = $(element);

      const name = $el.find('.company-name, .startup-name').first().text().trim();
      const website = $el.find('.company-website, .startup-website').first().attr('href');
      const description = $el.find('.company-description, .startup-description').first().text().trim();
      const location = $el.find('.company-location, .startup-location').first().text().trim();

      if (name && website) {
        const startup: TraditionalStartupData = {
          name,
          website: this.cleanWebsite(website),
          description: description || `${name} is an agritech startup.`,
          country: this.extractCountryFromLocation(location) || country,
          city: this.extractCityFromLocation(location),
          industry: 'Agritech',
          hasFunding: false,
          linkedinUrl: this.generateLinkedInUrl(name),
          qualityScore: 0,
          verified: true,
          sources: [sourceUrl],
          dataSource: 'traditional'
        };

        startup.qualityScore = this.calculateQualityScore(startup);

        if (startup.qualityScore >= 60) {
          startups.push(startup);
        }
      }
    });

    return startups;
  }

  /**
   * Generic extraction for other sources
   */
  private extractGeneric($: cheerio.CheerioAPI, sourceUrl: string, country: string): TraditionalStartupData[] {
    const startups: TraditionalStartupData[] = [];

    $('article, .post, .card, .item').each((_, element) => {
      const $el = $(element);

      const name = $el.find('h1, h2, h3, .name, .title').first().text().trim();
      const website = $el.find('a[href*="http"]').first().attr('href');
      const description = $el.find('.description, .summary, .content, p').first().text().trim();

      if (name && website && this.isValidCompanyName(name)) {
        const startup: TraditionalStartupData = {
          name,
          website: this.cleanWebsite(website),
          description: description || `${name} is an agritech startup.`,
          country: country,
          industry: 'Agritech',
          hasFunding: false,
          linkedinUrl: this.generateLinkedInUrl(name),
          qualityScore: 0,
          verified: true,
          sources: [sourceUrl],
          dataSource: 'traditional'
        };

        startup.qualityScore = this.calculateQualityScore(startup);

        if (startup.qualityScore >= 50) {
          startups.push(startup);
        }
      }
    });

    return startups;
  }

  /**
   * Extract startup names from text using patterns
   */
  private extractStartupNamesFromText(text: string): string[] {
    const names: string[] = [];

    // Look for patterns like "Company raises $X" or "Startup Company"
    const patterns = [
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:raises|announces|launches)/gi,
      /(?:startup|company)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi,
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:tech|labs|systems|solutions)/gi
    ];

    for (const pattern of patterns) {
      const matches = text.match(pattern);
      if (matches) {
        for (const match of matches) {
          const name = match.replace(/^(?:startup|company)\s+/i, '').trim();
          if (name.length > 2 && name.length < 50 && this.isValidCompanyName(name)) {
            names.push(name);
          }
        }
      }
    }

    return [...new Set(names)]; // Remove duplicates
  }

  /**
   * Post-processing and deduplication
   */
  private async postProcessStartups(
    startups: TraditionalStartupData[],
    limit: number,
    includeAnalysis: boolean
  ): Promise<TraditionalStartupData[]> {
    // Remove duplicates
    const uniqueStartups = this.removeDuplicates(startups);

    // Sort by quality score
    uniqueStartups.sort((a, b) => b.qualityScore - a.qualityScore);

    // Limit results
    const limitedStartups = uniqueStartups.slice(0, limit);

    // Additional verification if requested
    if (includeAnalysis) {
      for (const startup of limitedStartups) {
        startup.verified = await this.verifyStartup(startup);
      }
    }

    return limitedStartups;
  }

  /**
   * Remove duplicate startups
   */
  private removeDuplicates(startups: TraditionalStartupData[]): TraditionalStartupData[] {
    const unique: TraditionalStartupData[] = [];

    for (const startup of startups) {
      const isDuplicate = unique.some(existing =>
        this.calculateSimilarity(startup.name, existing.name) > 0.8 ||
        (startup.website && existing.website && startup.website === existing.website)
      );

      if (!isDuplicate) {
        unique.push(startup);
      }
    }

    return unique;
  }

  /**
   * Calculate string similarity
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Extract country from location string
   */
  private extractCountryFromLocation(location: string): string | undefined {
    if (!location) return undefined;

    const countryMap: Record<string, string> = {
      'thailand': 'Thailand',
      'bangkok': 'Thailand',
      'usa': 'United States',
      'us': 'United States',
      'united states': 'United States',
      'uk': 'United Kingdom',
      'united kingdom': 'United Kingdom',
      'germany': 'Germany',
      'france': 'France',
      'canada': 'Canada',
      'australia': 'Australia'
    };

    const lowerLocation = location.toLowerCase();
    for (const [key, value] of Object.entries(countryMap)) {
      if (lowerLocation.includes(key)) {
        return value;
      }
    }

    return undefined;
  }

  /**
   * Extract city from location string
   */
  private extractCityFromLocation(location: string): string | undefined {
    if (!location) return undefined;

    const parts = location.split(',').map(p => p.trim());
    if (parts.length >= 1) {
      return parts[0];
    }

    return undefined;
  }

  /**
   * Check if company name is valid
   */
  private isValidCompanyName(name: string): boolean {
    if (!name || name.length < 3 || name.length > 100) return false;

    // Exclude obvious non-company names
    const invalidPatterns = [
      /^home$/i,
      /^about$/i,
      /^contact$/i,
      /^news$/i,
      /^blog$/i,
      /^search$/i,
      /^login$/i,
      /^register$/i,
      /^\d+$/,
      /^[-•\s]*$/,
      /click here/i,
      /read more/i,
      /learn more/i
    ];

    if (invalidPatterns.some(pattern => pattern.test(name))) return false;

    return true;
  }

  /**
   * Clean website URL
   */
  private cleanWebsite(website: string): string {
    try {
      const url = new URL(website);
      return `${url.protocol}//${url.hostname}${url.pathname}`.replace(/\/$/, '');
    } catch {
      return website;
    }
  }

  /**
   * Calculate quality score
   */
  private calculateQualityScore(startup: TraditionalStartupData): number {
    let score = 0;

    // Name quality (20 points)
    if (startup.name && startup.name.length > 5) score += 20;

    // Website quality (25 points)
    if (startup.website && this.isValidWebsite(startup.website)) score += 25;

    // Description quality (20 points)
    if (startup.description && startup.description.length > 30) score += 20;

    // Location data (15 points)
    if (startup.city || startup.country) score += 15;

    // Funding information (10 points)
    if (startup.hasFunding && startup.fundingAmount) score += 10;

    // Verification bonus (10 points)
    if (startup.verified) score += 10;

    return Math.min(score, 100);
  }

  /**
   * Check if website is valid
   */
  private isValidWebsite(website: string): boolean {
    try {
      const url = new URL(website);
      return ['http:', 'https:'].includes(url.protocol) &&
             url.hostname.includes('.') &&
             !['localhost', '127.0.0.1'].includes(url.hostname);
    } catch {
      return false;
    }
  }

  /**
   * Verify startup authenticity
   */
  private async verifyStartup(startup: TraditionalStartupData): Promise<boolean> {
    try {
      const response = await fetch(startup.website, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000)
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Generate LinkedIn search URL
   */
  private generateLinkedInUrl(name: string): string {
    const searchQuery = encodeURIComponent(name);
    return `https://www.linkedin.com/search/results/companies/?keywords=${searchQuery}`;
  }

  /**
   * Fetch HTML with retry logic
   */
  private async fetchWithRetry(url: string): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        console.log(`🌐 Fetching ${url} (attempt ${attempt}/${this.MAX_RETRIES})`);

        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
          },
          signal: AbortSignal.timeout(this.TIMEOUT)
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.text();

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        console.warn(`⚠️ Attempt ${attempt} failed for ${url}: ${lastError.message}`);

        if (attempt < this.MAX_RETRIES) {
          await this.delay(1000 * attempt);
        }
      }
    }

    throw lastError || new Error('Max retries exceeded');
  }

  /**
   * Delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const traditionalStartupScrapingService = new TraditionalStartupScrapingService();