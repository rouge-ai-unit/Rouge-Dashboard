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
      'https://agfundernews.com/',
      'https://agfundernews.com/tag/startups'
    ],
    f6s: [
      'https://www.f6s.com/companies/agriculture',
      'https://www.f6s.com/companies/farming',
      'https://www.f6s.com/companies/foodtech'
    ],
    additional: [
      'https://www.agritech-east.co.uk/members/',
      'https://www.agriculture.com/technology',
      'https://www.farmprogress.com/technology',
      'https://www.foodnavigator.com/tag/keyword/Food/agtech',
      // Add more working sources
      'https://www.agrilinks.org/stories',
      'https://www.fao.org/news/en/',
      'https://www.worldbank.org/en/topic/agriculture',
      'https://www.ifad.org/en/web/latest/story',
      'https://www.cgiar.org/news-events/',
      // Better working sources
      'https://www.agtechstartups.com/',
      'https://www.agtechinvestor.com/startups/',
      'https://www.agritech-t.com/startups/',
      'https://www.farmbrite.com/agritech-startups/',
      'https://www.conservation.org/stories',
      'https://www.undp.org/sustainable-development-goals',
      'https://www.un.org/en/climatechange/agriculture-forestry',
      'https://www.wri.org/topics/agriculture',
      'https://www.iisd.org/topic/agriculture',
      'https://www.odi.org/topics/agriculture'
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
          
          // Skip sources that returned empty content (e.g., 403 Forbidden)
          if (!html || html.trim().length === 0) {
            console.warn(`⚠️ Skipping ${url} - no content retrieved`);
            metadata.failedRequests++;
            continue;
          }
          
          const startups = await this.extractFromVerifiedSource(html, url, country);

          allStartups.push(...startups);
          metadata.successfulRequests++;

          console.log(`📊 Source ${url}: Extracted ${startups.length} startups (Total so far: ${allStartups.length})`);

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

    // Add country-specific sources (only working ones)
    if (country === 'all' || country === 'Thailand') {
      urls.push(
        'https://techcrunch.com/search/agritech-thailand/',
        'https://agfundernews.com/tag/thailand'
      );
    }

    if (country === 'all' || country === 'us') {
      urls.push(
        'https://techcrunch.com/tag/agritech/',
        'https://agfundernews.com/tag/us'
      );
    }

    // Add general verified sources (only working ones)
    urls.push(
      'https://www.crunchbase.com/hub/agritech-startups',
      'https://angel.co/companies?keywords=agritech',
      'https://techcrunch.com/tag/agritech/',
      'https://agfundernews.com/',
      'https://www.f6s.com/companies/agriculture',
      'https://www.agritech-east.co.uk/members/',
      'https://www.agriculture.com/technology',
      'https://www.farmprogress.com/technology',
      'https://www.foodnavigator.com/tag/keyword/Food/agtech'
    );

    // Remove duplicates
    return [...new Set(urls)];
  }

  /**
   * Get verified fallback startups when scraping finds few results
   */
  /**
   * Extract startups from verified sources
   */
  private async extractFromVerifiedSource(html: string, sourceUrl: string, country: string): Promise<TraditionalStartupData[]> {
    const startups: TraditionalStartupData[] = [];
    const $ = cheerio.load(html);

    // Different extraction strategies based on source
    if (sourceUrl.includes('crunchbase.com')) {
      startups.push(...this.extractFromCrunchbase($, sourceUrl, country));

      // If no startups found from regular extraction, try alternative methods
      if (startups.length === 0) {
        console.log(`🔄 No startups found with regular Crunchbase extraction, trying alternatives for ${sourceUrl}`);
        try {
          const alternativeStartups = await this.tryAlternativeCrunchbaseMethods(sourceUrl, country);
          startups.push(...alternativeStartups);
        } catch (error) {
          console.warn(`⚠️ Alternative Crunchbase methods also failed for ${sourceUrl}:`, error);
        }
      }
    } else if (sourceUrl.includes('angel.co')) {
      startups.push(...this.extractFromAngelList($, sourceUrl, country));
    } else if (sourceUrl.includes('techcrunch.com')) {
      startups.push(...this.extractFromTechCrunch($, sourceUrl, country));
    } else if (sourceUrl.includes('agfundernews.com')) {
      startups.push(...this.extractFromAgFunder($, sourceUrl, country));
    } else if (sourceUrl.includes('f6s.com')) {
      startups.push(...this.extractFromF6S($, sourceUrl, country));
    } else {
      // Generic extraction for other verified sources (agritech-east, foodnavigator, agriculture.com, farmprogress, etc.)
      startups.push(...this.extractGeneric($, sourceUrl, country));
    }

    return startups;
  }

  /**
   * Extract from Crunchbase
   */
  private extractFromCrunchbase($: cheerio.CheerioAPI, sourceUrl: string, country: string): TraditionalStartupData[] {
    const startups: TraditionalStartupData[] = [];

    // Check if we got a login page or blocked page
    const pageTitle = $('title').text().toLowerCase();
    if (pageTitle.includes('login') || pageTitle.includes('sign in') || pageTitle.includes('blocked') || pageTitle.includes('access denied')) {
      console.warn(`🚫 Crunchbase returned login/blocked page for ${sourceUrl} - cannot extract data`);
      return startups;
    }

    // Check for common bot detection messages
    const bodyText = $('body').text().toLowerCase();
    if (bodyText.includes('bot detected') || bodyText.includes('access denied') || bodyText.includes('please verify')) {
      console.warn(`🤖 Bot detection triggered on ${sourceUrl} - cannot extract data`);
      return startups;
    }

    // Multiple selector strategies for Crunchbase (they change their HTML structure frequently)
    const selectors = [
      '.entity-card',
      '.company-card',
      '.organization-card',
      '.cb-company-card',
      '.hub-company-card',
      '[data-test="company-card"]',
      '.company-item',
      '.search-result-item',
      '.entity-result',
      '.mat-card',
      '.company-list-item'
    ];

    let foundStartups = false;

    for (const selector of selectors) {
      $(selector).each((_, element) => {
        const $el = $(element);
        foundStartups = true;

        // Try multiple ways to extract data
        const nameSelectors = [
          '.entity-name',
          '.company-name',
          'h3',
          '.name',
          '.title',
          '[data-test="company-name"]',
          '.cb-company-name',
          '.mat-card-title'
        ];

        const websiteSelectors = [
          '.entity-website',
          '.company-website',
          'a[href*="http"]',
          '[data-test="company-website"]',
          '.website-link'
        ];

        const descriptionSelectors = [
          '.entity-description',
          '.company-description',
          '.description',
          '[data-test="company-description"]',
          '.mat-card-content p'
        ];

        const locationSelectors = [
          '.entity-location',
          '.company-location',
          '.location',
          '[data-test="company-location"]',
          '.location-text'
        ];

        let name = '';
        for (const nameSel of nameSelectors) {
          name = $el.find(nameSel).first().text().trim();
          if (name) break;
        }

        let website = '';
        for (const webSel of websiteSelectors) {
          website = $el.find(webSel).first().attr('href') || '';
          if (website) break;
        }

        let description = '';
        for (const descSel of descriptionSelectors) {
          description = $el.find(descSel).first().text().trim();
          if (description) break;
        }

        let location = '';
        for (const locSel of locationSelectors) {
          location = $el.find(locSel).first().text().trim();
          if (location) break;
        }

        // If we found a name and website, create the startup
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

          console.log(`🔍 Crunchbase: Found startup "${name}" - Website: ${startup.website}, Score: ${startup.qualityScore}, Location: ${location}`);

          if (startup.qualityScore >= 60) {
            console.log(`✅ Crunchbase: Accepted startup "${name}" with score ${startup.qualityScore}`);
            startups.push(startup);
          } else {
            console.log(`❌ Crunchbase: Rejected startup "${name}" with score ${startup.qualityScore} (too low)`);
          }
        }
      });

      // If we found startups with this selector, no need to try others
      if (foundStartups) break;
    }

    // If no startups found with card selectors, try table/list views
    if (startups.length === 0) {
      $('tr, .list-item, .result-item, .table-row').each((_, element) => {
        const $el = $(element);

        const name = $el.find('td:first-child a, .name, .title, h4').first().text().trim();
        const website = $el.find('a[href*="http"], .website').first().attr('href') || '';
        const description = $el.find('.description, td:nth-child(3), p').first().text().trim();
        const location = $el.find('.location, td:nth-child(4), .address').first().text().trim();

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

          console.log(`🔍 Crunchbase Table: Found startup "${name}" - Website: ${startup.website}, Score: ${startup.qualityScore}`);

          if (startup.qualityScore >= 60) {
            console.log(`✅ Crunchbase Table: Accepted startup "${name}" with score ${startup.qualityScore}`);
            startups.push(startup);
          } else {
            console.log(`❌ Crunchbase Table: Rejected startup "${name}" with score ${startup.qualityScore} (too low)`);
          }
        }
      });
    }

    console.log(`📊 Extracted ${startups.length} startups from Crunchbase ${sourceUrl}`);
    return startups;
  }

  /**
   * Extract from AngelList
   */
  private extractFromAngelList($: cheerio.CheerioAPI, sourceUrl: string, country: string): TraditionalStartupData[] {
    const startups: TraditionalStartupData[] = [];

    console.log(`🔍 AngelList: Looking for startup cards on ${sourceUrl}`);

    // Multiple selector strategies for AngelList
    const selectors = [
      '.startup-card',
      '.company-card',
      '.company',
      '.startup',
      '[data-test="company-card"]',
      '.company-result',
      '.search-result'
    ];

    let foundStartups = false;

    for (const selector of selectors) {
      $(selector).each((_, element) => {
        const $el = $(element);
        foundStartups = true;

        const nameSelectors = [
          '.startup-name',
          '.company-name',
          '.name',
          'h3',
          'h4',
          '.title',
          '[data-test="company-name"]'
        ];

        const websiteSelectors = [
          '.startup-url',
          '.company-url',
          '.website',
          'a[href*="http"]',
          '[data-test="company-website"]'
        ];

        const descriptionSelectors = [
          '.startup-description',
          '.company-description',
          '.description',
          '.summary',
          'p'
        ];

        const locationSelectors = [
          '.startup-location',
          '.company-location',
          '.location',
          '[data-test="company-location"]'
        ];

        let name = '';
        for (const nameSel of nameSelectors) {
          name = $el.find(nameSel).first().text().trim();
          if (name) break;
        }

        let website = '';
        for (const webSel of websiteSelectors) {
          website = $el.find(webSel).first().attr('href') || $el.find(webSel).first().text().trim();
          if (website) break;
        }

        let description = '';
        for (const descSel of descriptionSelectors) {
          description = $el.find(descSel).first().text().trim();
          if (description) break;
        }

        let location = '';
        for (const locSel of locationSelectors) {
          location = $el.find(locSel).first().text().trim();
          if (location) break;
        }

        console.log(`🔍 AngelList: Found potential startup - Name: "${name}", Website: "${website}"`);

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
            console.log(`✅ AngelList: Accepted startup "${name}" with score ${startup.qualityScore}`);
            startups.push(startup);
          } else {
            console.log(`❌ AngelList: Rejected startup "${name}" with score ${startup.qualityScore} (too low)`);
          }
        }
      });

      // If we found startups with this selector, no need to try others
      if (foundStartups) break;
    }

    console.log(`📊 AngelList: Extracted ${startups.length} startups from ${sourceUrl}`);
    return startups;
  }

  /**
   * Extract from TechCrunch
   */
  private extractFromTechCrunch($: cheerio.CheerioAPI, sourceUrl: string, country: string): TraditionalStartupData[] {
    const startups: TraditionalStartupData[] = [];

    console.log(`🔍 TechCrunch: Looking for articles on ${sourceUrl}`);

    $('article, .post, .article, .river-block').each((_, element) => {
      const $el = $(element);

      const titleSelectors = [
        'h1, h2, .article-title, .post-title, .river-title, .headline',
        '.content h1, .content h2'
      ];

      const excerptSelectors = [
        '.excerpt, .article-excerpt, .post-excerpt, .summary, .content p:first-child',
        '.river-excerpt, .description'
      ];

      const linkSelectors = [
        'a',
        '.article-link',
        '.post-link',
        'h1 a, h2 a, .headline a'
      ];

      let title = '';
      for (const titleSel of titleSelectors) {
        title = $el.find(titleSel).first().text().trim();
        if (title) break;
      }

      let excerpt = '';
      for (const excerptSel of excerptSelectors) {
        excerpt = $el.find(excerptSel).first().text().trim();
        if (excerpt) break;
      }

      let link = '';
      for (const linkSel of linkSelectors) {
        link = $el.find(linkSel).first().attr('href') || '';
        if (link) break;
      }

      console.log(`🔍 TechCrunch: Found article - Title: "${title?.substring(0, 50)}...", Link: "${link}"`);

      // Look for startup mentions in TechCrunch articles
      if (title && (title.toLowerCase().includes('startup') || title.toLowerCase().includes('raises') || title.toLowerCase().includes('agritech'))) {
        const startupNames = this.extractStartupNamesFromText(title + ' ' + excerpt);

        console.log(`🔍 TechCrunch: Found ${startupNames.length} potential startup names in article`);

        for (const name of startupNames) {
          const startup: TraditionalStartupData = {
            name,
            website: link ? this.cleanWebsite(link) : `https://www.${name.toLowerCase().replace(/\s+/g, '')}.com`,
            description: excerpt || `${name} is featured in TechCrunch.`,
            country: country,
            industry: 'Agritech',
            hasFunding: title.toLowerCase().includes('raises') || title.toLowerCase().includes('funding'),
            linkedinUrl: this.generateLinkedInUrl(name),
            qualityScore: 0,
            verified: true,
            sources: [sourceUrl],
            dataSource: 'traditional'
          };

          startup.qualityScore = this.calculateQualityScore(startup);

          console.log(`🔍 TechCrunch: Startup "${name}" - Score: ${startup.qualityScore}, HasFunding: ${startup.hasFunding}`);

          if (startup.qualityScore >= 50) {
            console.log(`✅ TechCrunch: Accepted startup "${name}" with score ${startup.qualityScore}`);
            startups.push(startup);
          } else {
            console.log(`❌ TechCrunch: Rejected startup "${name}" with score ${startup.qualityScore} (too low)`);
          }
        }
      }
    });

    console.log(`📊 TechCrunch: Extracted ${startups.length} startups from ${sourceUrl}`);
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

    console.log(`🔍 Generic: Processing ${sourceUrl}`);

    $('article, .post, .card, .item').each((_, element) => {
      const $el = $(element);

      const name = $el.find('h1, h2, h3, .name, .title').first().text().trim();
      const website = $el.find('a[href*="http"]').first().attr('href');
      const description = $el.find('.description, .summary, .content, p').first().text().trim();

      console.log(`🔍 Generic: Found element - Name: "${name}", Website: "${website}"`);

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

        console.log(`🔍 Generic: Found startup "${name}" - Website: ${startup.website}, Score: ${startup.qualityScore}, ValidName: ${this.isValidCompanyName(name)}`);

        if (startup.qualityScore >= 50) {
          console.log(`✅ Generic: Accepted startup "${name}" with score ${startup.qualityScore}`);
          startups.push(startup);
        } else {
          console.log(`❌ Generic: Rejected startup "${name}" with score ${startup.qualityScore} (too low)`);
        }
      }
    });

    console.log(`📊 Generic: Extracted ${startups.length} startups from ${sourceUrl}`);
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

    // Different user agents for different sources
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0'
    ];

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        console.log(`🌐 Fetching ${url} (attempt ${attempt}/${this.MAX_RETRIES})`);

        // Rotate user agents
        const userAgent = userAgents[attempt % userAgents.length];

        const headers: Record<string, string> = {
          'User-Agent': userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
          'Cache-Control': 'max-age=0'
        };

        // Special headers for Crunchbase
        if (url.includes('crunchbase.com')) {
          headers['Referer'] = 'https://www.crunchbase.com/';
          headers['Sec-Ch-Ua'] = '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"';
          headers['Sec-Ch-Ua-Mobile'] = '?0';
          headers['Sec-Ch-Ua-Platform'] = '"Windows"';
          headers['DNT'] = '1';
        }

        const response = await fetch(url, {
          headers,
          signal: AbortSignal.timeout(this.TIMEOUT)
        });

        if (!response.ok) {
          // Handle 403 Forbidden (access denied) by skipping the source
          if (response.status === 403) {
            console.warn(`🚫 Source ${url} requires authentication or has bot protection - skipping`);
            return ''; // Return empty string to indicate source should be skipped
          }
          // Handle 429 (rate limited) with longer delay
          if (response.status === 429) {
            console.warn(`⏱️ Rate limited on ${url}, waiting longer...`);
            await this.delay(5000 * attempt);
            continue;
          }
          // Handle 404 Not Found (page doesn't exist) by skipping the source
          if (response.status === 404) {
            console.warn(`📄 Source ${url} not found (404) - skipping`);
            return ''; // Return empty string to indicate source should be skipped
          }
          // Handle 410 Gone (permanently removed) by skipping the source
          if (response.status === 410) {
            console.warn(`🗑️ Source ${url} permanently removed (410) - skipping`);
            return ''; // Return empty string to indicate source should be skipped
          }
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.text();

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        console.warn(`⚠️ Attempt ${attempt} failed for ${url}: ${lastError.message}`);

        if (attempt < this.MAX_RETRIES) {
          // Longer delay for Crunchbase
          const delay = url.includes('crunchbase.com') ? 3000 * attempt : 1000 * attempt;
          await this.delay(delay);
        }
      }
    }

    throw lastError || new Error('Max retries exceeded');
  }

  /**
   * Try alternative Crunchbase scraping methods
   */
  private async tryAlternativeCrunchbaseMethods(url: string, country: string): Promise<TraditionalStartupData[]> {
    const startups: TraditionalStartupData[] = [];

    try {
      // Try API-like endpoints (Crunchbase has some public APIs)
      const apiUrls = [
        url.replace('/hub/', '/search/organizations?query='),
        url.replace('/hub/', '/search/companies?query='),
        `${url}/companies`
      ];

      for (const apiUrl of apiUrls) {
        try {
          console.log(`🔄 Trying alternative Crunchbase endpoint: ${apiUrl}`);
          const html = await this.fetchWithRetry(apiUrl);
          if (html) {
            const $ = cheerio.load(html);
            const apiStartups = this.extractFromCrunchbase($, apiUrl, country);
            startups.push(...apiStartups);
          }
        } catch (error) {
          console.warn(`⚠️ Alternative endpoint ${apiUrl} failed:`, error);
        }
      }

      // Try search-based URLs
      const searchTerms = ['agritech', 'agriculture', 'farming', 'foodtech'];
      for (const term of searchTerms) {
        try {
          const searchUrl = `https://www.crunchbase.com/search/organizations?query=${encodeURIComponent(term)}`;
          console.log(`🔍 Trying Crunchbase search: ${searchUrl}`);
          const html = await this.fetchWithRetry(searchUrl);
          if (html) {
            const $ = cheerio.load(html);
            const searchStartups = this.extractFromCrunchbase($, searchUrl, country);
            startups.push(...searchStartups);
          }
        } catch (error) {
          console.warn(`⚠️ Search for ${term} failed:`, error);
        }
      }

    } catch (error) {
      console.error(`❌ All alternative Crunchbase methods failed:`, error);
    }

    return startups;
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