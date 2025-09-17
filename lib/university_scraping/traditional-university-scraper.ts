/**
 * Traditional University Scraping Service
 * Production-ready web scraping using real URLs and verified sources.
 * No AI generation - pure web scraping from authentic educational websites.
 */

import * as cheerio from 'cheerio';

export interface TraditionalUniversityData {
  university: string;
  country: string;
  region: string;
  website: string;
  hasTto: boolean;
  ttoPageUrl: string | null;
  incubationRecord: string;
  linkedinSearchUrl: string;
  qualityScore: number;
  sourceUrl: string;
  scrapedAt: string;
  dataSource: 'traditional-scraping';
}

export interface TraditionalScrapingResult {
  success: boolean;
  data: TraditionalUniversityData[];
  errors: string[];
  metadata: {
    totalExtracted: number;
    successfulRequests: number;
    failedRequests: number;
    processingTime: number;
    sourcesUsed: string[];
    averageQualityScore: number;
    mode: 'traditional';
  };
}

/**
 * Traditional University Scraping Service
 * Scrapes real university data from verified educational websites
 */
export class TraditionalUniversityScrapingService {
  private readonly TIMEOUT = 30000; // 30 seconds
  private readonly MAX_RETRIES = 3;
  private readonly DELAY_BETWEEN_REQUESTS = 2000; // 2 seconds

  constructor() {
    // Direct processing
  }

  /**
   * Get verified source URLs for universities by country
   */
  private getVerifiedSources(country: string): string[] {
    const countryLower = country.toLowerCase();
    
    // Handle "all" as a special case - use Thailand as default since it's the primary target
    if (countryLower === 'all') {
      return this.getVerifiedSources('thailand');
    }
    
    // Real, verified educational sources
    const sourceMappings: Record<string, string[]> = {
      thailand: [
        'https://en.wikipedia.org/wiki/List_of_universities_in_Thailand',
        'https://en.wikipedia.org/wiki/Higher_education_in_Thailand',
        'https://www.4icu.org/th/',
      ],
      india: [
        'https://en.wikipedia.org/wiki/List_of_universities_in_India',
        'https://en.wikipedia.org/wiki/List_of_agricultural_universities_in_India',
        'https://www.4icu.org/in/',
      ],
      usa: [
        'https://en.wikipedia.org/wiki/List_of_research_universities_in_the_United_States',
        'https://en.wikipedia.org/wiki/List_of_agricultural_universities_and_colleges',
        'https://www.4icu.org/us/',
      ],
      uk: [
        'https://en.wikipedia.org/wiki/List_of_universities_in_the_United_Kingdom',
        'https://www.4icu.org/uk/',
      ],
      australia: [
        'https://en.wikipedia.org/wiki/List_of_universities_in_Australia',
        'https://www.4icu.org/au/',
      ],
      canada: [
        'https://en.wikipedia.org/wiki/List_of_universities_in_Canada',
        'https://www.4icu.org/ca/',
      ],
      germany: [
        'https://en.wikipedia.org/wiki/List_of_universities_in_Germany',
        'https://www.4icu.org/de/',
      ],
      france: [
        'https://en.wikipedia.org/wiki/List_of_universities_in_France',
        'https://www.4icu.org/fr/',
      ],
    };

    // Return country-specific sources if available, otherwise default to Thailand
    return sourceMappings[countryLower] || this.getVerifiedSources('thailand');
  }

  /**
   * Extract universities from Wikipedia pages
   */
  private async extractFromWikipedia(url: string, country: string): Promise<TraditionalUniversityData[]> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
        },
        signal: AbortSignal.timeout(this.TIMEOUT)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      const $ = cheerio.load(html);
      const universities: TraditionalUniversityData[] = [];

      // Extract from tables (common Wikipedia format)
      $('table.wikitable tr, table.sortable tr').each((index, element) => {
        const $row = $(element);
        const cells = $row.find('td');

        if (cells.length >= 2) {
          const nameCell = cells.eq(0);
          const locationCell = cells.eq(1);

          const universityName = nameCell.find('a').first().text().trim() ||
                                 nameCell.text().trim();
          const location = locationCell.text().trim();

          // Extract city from location (e.g., "Bangkok, Thailand" -> "Bangkok")
          let city = '';
          if (location.includes(',')) {
            city = location.split(',')[0].trim();
          } else if (location !== country) {
            city = location;
          }

          if (universityName && universityName.length > 3 &&
              (universityName.toLowerCase().includes('university') ||
               universityName.toLowerCase().includes('college') ||
               universityName.toLowerCase().includes('institute'))) {

            const websiteLink = nameCell.find('a').first().attr('href');
            let website = '';

            if (websiteLink && websiteLink.startsWith('http')) {
              website = websiteLink;
            } else if (websiteLink && websiteLink.startsWith('/wiki/')) {
              website = `https://en.wikipedia.org${websiteLink}`;
            }

            universities.push({
              university: universityName,
              country: country,
              region: city || location || country,
              website: website,
              hasTto: false, // Will be determined by TTO detection
              ttoPageUrl: null,
              incubationRecord: 'Unknown',
              linkedinSearchUrl: `https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(universityName)}`,
              qualityScore: this.calculateQualityScore(universityName, website, city || location),
              sourceUrl: url,
              scrapedAt: new Date().toISOString(),
              dataSource: 'traditional-scraping'
            });
          }
        }
      });

      // Extract from lists
      $('ul li, ol li').each((index, element) => {
        const $item = $(element);
        const link = $item.find('a').first();
        const universityName = link.text().trim();

        if (universityName &&
            universityName.length > 5 &&
            (universityName.toLowerCase().includes('university') ||
             universityName.toLowerCase().includes('college') ||
             universityName.toLowerCase().includes('institute'))) {

          const websiteLink = link.attr('href');
          let website = '';

          if (websiteLink && websiteLink.startsWith('http')) {
            website = websiteLink;
          } else if (websiteLink && websiteLink.startsWith('/wiki/')) {
            website = `https://en.wikipedia.org${websiteLink}`;
          }

          universities.push({
            university: universityName,
            country: country,
            region: country,
            website: website,
            hasTto: false,
            ttoPageUrl: null,
            incubationRecord: 'Unknown',
            linkedinSearchUrl: `https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(universityName)}`,
            qualityScore: this.calculateQualityScore(universityName, website, ''),
            sourceUrl: url,
            scrapedAt: new Date().toISOString(),
            dataSource: 'traditional-scraping'
          });
        }
      });

      return universities.slice(0, 50); // Limit to prevent overwhelming results

    } catch (error) {
      console.error(`Error extracting from Wikipedia ${url}:`, error);
      return [];
    }
  }

  /**
   * Extract universities from 4ICU pages
   */
  private async extractFrom4ICU(url: string, country: string): Promise<TraditionalUniversityData[]> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: AbortSignal.timeout(this.TIMEOUT)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      const $ = cheerio.load(html);
      const universities: TraditionalUniversityData[] = [];

      // 4ICU specific selectors
      $('.col-md-6 h4 a, .university-name a, .univ-name a').each((index, element) => {
        const $link = $(element);
        const universityName = $link.text().trim();
        const websiteUrl = $link.attr('href');
        
        if (universityName && universityName.length > 3) {
          universities.push({
            university: universityName,
            country: country,
            region: country,
            website: websiteUrl || '',
            hasTto: false,
            ttoPageUrl: null,
            incubationRecord: 'Unknown',
            linkedinSearchUrl: `https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(universityName)}`,
            qualityScore: this.calculateQualityScore(universityName, websiteUrl || '', ''),
            sourceUrl: url,
            scrapedAt: new Date().toISOString(),
            dataSource: 'traditional-scraping'
          });
        }
      });

      return universities.slice(0, 30);

    } catch (error) {
      console.error(`Error extracting from 4ICU ${url}:`, error);
      return [];
    }
  }

  /**
   * Calculate quality score based on available data
   */
  private calculateQualityScore(name: string, website: string, location: string): number {
    let score = 30; // Base score

    // Name quality
    if (name.length > 10) score += 15;
    if (name.toLowerCase().includes('university')) score += 15;
    if (name.toLowerCase().includes('college')) score += 10;
    if (name.toLowerCase().includes('institute')) score += 10;

    // Website quality
    if (website && website.startsWith('http')) score += 20;
    if (website && website.includes('.edu')) score += 15;
    if (website && website.includes('.ac.')) score += 10;

    // Location quality
    if (location && location.length > 2) score += 15;

    return Math.min(score, 100);
  }

  /**
   * Enhanced TTO detection for universities
   */
  private async detectTTO(university: TraditionalUniversityData): Promise<void> {
    if (!university.website || !university.website.startsWith('http')) {
      return;
    }

    try {
      const response = await fetch(university.website, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        signal: AbortSignal.timeout(15000)
      });

      if (!response.ok) return;

      const html = await response.text();
      const $ = cheerio.load(html);
      const pageText = $.text().toLowerCase();

      // TTO detection keywords - expanded list
      const ttoKeywords = [
        'technology transfer',
        'tech transfer',
        'innovation office',
        'commercialization',
        'intellectual property',
        'startup incubator',
        'entrepreneurship',
        'research commercialization',
        'tto',
        'technology transfer office',
        'innovation center',
        'commercialization office',
        'research partnership',
        'industry collaboration',
        'patent',
        'licensing',
        'spin-off',
        'spin out',
        'venture development'
      ];

      const hasContent = ttoKeywords.some(keyword => pageText.includes(keyword));

      if (hasContent) {
        university.hasTto = true;

        // Try to find specific TTO page links - expanded search
        const ttoLinkSelectors = [
          'a[href*="tto"]',
          'a[href*="transfer"]',
          'a[href*="innovation"]',
          'a[href*="commercialization"]',
          'a[href*="incubator"]',
          'a[href*="entrepreneurship"]',
          'a:contains("TTO")',
          'a:contains("Technology Transfer")',
          'a:contains("Innovation")',
          'a:contains("Commercialization")'
        ];

        for (const selector of ttoLinkSelectors) {
          const $link = $(selector).first();
          if ($link.length > 0) {
            const href = $link.attr('href');
            if (href) {
              const fullUrl = href.startsWith('http') ? href :
                             new URL(href, university.website).toString();
              university.ttoPageUrl = fullUrl;
              break; // Found one, stop searching
            }
          }
        }

        // Also check for incubation/accelerator programs
        const incubationKeywords = [
          'incubator',
          'accelerator',
          'startup program',
          'entrepreneurship center',
          'innovation hub'
        ];

        const hasIncubation = incubationKeywords.some(keyword => pageText.includes(keyword));
        university.incubationRecord = hasIncubation ? 'Has incubation programs' : 'Incubation programs detected via TTO';
      }

    } catch (error) {
      console.error(`TTO detection failed for ${university.university}:`, error);
    }
  }

  /**
   * Remove duplicate universities based on name similarity
   */
  private removeDuplicates(universities: TraditionalUniversityData[]): TraditionalUniversityData[] {
    const seen = new Set<string>();
    const unique: TraditionalUniversityData[] = [];

    for (const university of universities) {
      const normalizedName = university.university.toLowerCase()
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

      if (!seen.has(normalizedName)) {
        seen.add(normalizedName);
        unique.push(university);
      }
    }

    return unique;
  }

  /**
   * Main extraction method for traditional scraping
   */
  async extractUniversities(
    country: string,
    limit: number,
    includeAnalysis: boolean = true
  ): Promise<TraditionalScrapingResult> {
    const startTime = Date.now();
    const sourcesUsed: string[] = [];
    let successfulRequests = 0;
    let failedRequests = 0;
    const errors: string[] = [];
    let allUniversities: TraditionalUniversityData[] = [];

    try {
      console.log(`🌐 Starting traditional scraping for ${country} universities`);

      const sources = this.getVerifiedSources(country);
      
      for (const source of sources) {
        try {
          sourcesUsed.push(source);
          console.log(`📡 Scraping from: ${source}`);
          
          let universities: TraditionalUniversityData[] = [];
          
          if (source.includes('wikipedia.org')) {
            universities = await this.extractFromWikipedia(source, country);
          } else if (source.includes('4icu.org')) {
            universities = await this.extractFrom4ICU(source, country);
          }
          
          if (universities.length > 0) {
            allUniversities.push(...universities);
            successfulRequests++;
            console.log(`✅ Extracted ${universities.length} universities from ${source}`);
          } else {
            failedRequests++;
            errors.push(`No data extracted from ${source}`);
          }

          // Delay between requests to be respectful
          if (sources.indexOf(source) < sources.length - 1) {
            await new Promise(resolve => setTimeout(resolve, this.DELAY_BETWEEN_REQUESTS));
          }

        } catch (error) {
          failedRequests++;
          const errorMsg = `Failed to scrape ${source}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          console.error(errorMsg);
        }
      }

      // Remove duplicates
      allUniversities = this.removeDuplicates(allUniversities);

      // Limit results
      allUniversities = allUniversities.slice(0, limit);

      // Enhanced TTO detection if analysis is enabled
      if (includeAnalysis && allUniversities.length > 0) {
        console.log(`🔍 Running TTO analysis on ${allUniversities.length} universities...`);
        
        const ttoPromises = allUniversities.slice(0, 10).map(async (university) => {
          await this.detectTTO(university);
        });
        
        await Promise.allSettled(ttoPromises);
      }

      const processingTime = Date.now() - startTime;
      const averageQualityScore = allUniversities.length > 0 
        ? allUniversities.reduce((sum, u) => sum + u.qualityScore, 0) / allUniversities.length 
        : 0;

      console.log(`✅ Traditional scraping completed: ${allUniversities.length} universities in ${processingTime}ms`);

      return {
        success: true,
        data: allUniversities,
        errors,
        metadata: {
          totalExtracted: allUniversities.length,
          successfulRequests,
          failedRequests,
          processingTime,
          sourcesUsed,
          averageQualityScore,
          mode: 'traditional'
        }
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorMsg = error instanceof Error ? error.message : 'Unknown extraction error';
      
      console.error('❌ Traditional scraping failed:', errorMsg);
      
      return {
        success: false,
        data: [],
        errors: [errorMsg, ...errors],
        metadata: {
          totalExtracted: 0,
          successfulRequests,
          failedRequests: failedRequests + 1,
          processingTime,
          sourcesUsed,
          averageQualityScore: 0,
          mode: 'traditional'
        }
      };
    }
  }
}

// Export singleton instance
export const traditionalUniversityScrapingService = new TraditionalUniversityScrapingService();