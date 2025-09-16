/**
 * Advanced Agritech Validation Engine
 * Enterprise-grade startup validation with ML-inspired algorithms
 */

export interface ValidationCriteria {
  name: string;
  weight: number;
  validator: (input: string) => ValidationResult;
}

export interface ValidationResult {
  score: number;
  isValid: boolean;
  confidence: number;
  issues: string[];
  suggestions: string[];
  keywords: string[];
}

export interface ComprehensiveValidationResult {
  overallScore: number;
  confidence: number;
  isValid: boolean;
  category: 'excellent' | 'good' | 'fair' | 'poor';
  results: Record<string, ValidationResult>;
  recommendations: string[];
  marketPotential: number;
  technicalFeasibility: number;
  businessViability: number;
}

/**
 * Comprehensive agritech keyword database
 */
const AGRITECH_KEYWORDS = {
  // Core Agriculture
  core: [
    'agriculture', 'agricultural', 'agri', 'farm', 'farming', 'farmer', 'farmers',
    'crop', 'crops', 'harvest', 'harvesting', 'cultivation', 'planting', 'growing',
    'livestock', 'cattle', 'dairy', 'poultry', 'pig', 'swine', 'sheep', 'goat',
    'aquaculture', 'fishery', 'fisheries', 'aqua', 'fish', 'shrimp', 'salmon'
  ],
  
  // Technology & Innovation
  technology: [
    'agtech', 'agritech', 'foodtech', 'precision', 'smart farming', 'digital agriculture',
    'iot', 'sensors', 'drones', 'satellite', 'gps', 'automation', 'robotics',
    'ai', 'machine learning', 'computer vision', 'blockchain', 'data analytics'
  ],
  
  // Farming Methods
  methods: [
    'organic', 'sustainable', 'regenerative', 'vertical farming', 'hydroponics',
    'aquaponics', 'greenhouse', 'controlled environment', 'indoor farming',
    'precision agriculture', 'conservation tillage', 'permaculture'
  ],
  
  // Inputs & Resources
  inputs: [
    'seed', 'seeds', 'fertilizer', 'pesticide', 'herbicide', 'irrigation',
    'water management', 'soil', 'nutrients', 'feed', 'fodder', 'compost',
    'biofertilizer', 'biopesticide', 'micronutrients'
  ],
  
  // Crops & Products
  products: [
    'rice', 'wheat', 'corn', 'maize', 'soybean', 'soy', 'cotton', 'sugarcane',
    'potato', 'tomato', 'vegetables', 'fruits', 'grains', 'cereals', 'pulses',
    'coffee', 'tea', 'cocoa', 'palm oil', 'rubber', 'biomass'
  ],
  
  // Supply Chain & Processing
  supply: [
    'food processing', 'food safety', 'traceability', 'supply chain',
    'post-harvest', 'storage', 'logistics', 'cold chain', 'packaging',
    'food waste', 'value chain', 'farm to fork'
  ]
};

/**
 * Market indicators for business validation
 */
const MARKET_INDICATORS = [
  'market', 'customer', 'customers', 'revenue', 'sales', 'profit', 'roi',
  'funding', 'investment', 'investor', 'venture', 'traction', 'growth',
  'users', 'adoption', 'scale', 'scalability', 'demand', 'opportunity'
];

/**
 * Technical feasibility indicators
 */
const TECH_INDICATORS = [
  'technology', 'tech', 'platform', 'software', 'hardware', 'system',
  'solution', 'innovation', 'patent', 'research', 'development', 'prototype',
  'mvp', 'pilot', 'testing', 'validation', 'proof of concept'
];

/**
 * Quality indicators for startups
 */
const QUALITY_INDICATORS = [
  'team', 'founder', 'experience', 'expertise', 'background', 'track record',
  'advisors', 'partnerships', 'collaboration', 'awards', 'recognition',
  'certification', 'compliance', 'standards'
];

export class AgritechValidationEngine {
  
  /**
   * Comprehensive startup validation
   */
  static validateStartup(
    name: string,
    description: string,
    website?: string,
    additionalInfo?: string
  ): ComprehensiveValidationResult {
    
    const combinedText = `${name} ${description} ${additionalInfo || ''}`.toLowerCase();
    
    // Individual validation results
    const results = {
      name: this.validateName(name),
      description: this.validateDescription(description),
      website: this.validateWebsite(website || ''),
      agritechFocus: this.validateAgritechFocus(combinedText),
      marketReadiness: this.validateMarketReadiness(combinedText),
      technicalFeasibility: this.validateTechnicalFeasibility(combinedText),
      businessViability: this.validateBusinessViability(combinedText)
    };
    
    // Calculate weighted overall score
    const weights = {
      name: 0.1,
      description: 0.2,
      website: 0.1,
      agritechFocus: 0.25,
      marketReadiness: 0.15,
      technicalFeasibility: 0.1,
      businessViability: 0.1
    };
    
    const overallScore = Object.entries(results).reduce((sum, [key, result]) => {
      return sum + (result.score * weights[key as keyof typeof weights]);
    }, 0);
    
    // Calculate confidence based on description length and detail
    const confidence = Math.min(100, Math.max(50, 
      50 + (description.length / 10) + 
      (results.agritechFocus.keywords.length * 5)
    ));
    
    // Determine category
    let category: ComprehensiveValidationResult['category'];
    if (overallScore >= 85) category = 'excellent';
    else if (overallScore >= 70) category = 'good';
    else if (overallScore >= 55) category = 'fair';
    else category = 'poor';
    
    // Generate comprehensive recommendations
    const recommendations = this.generateRecommendations(results);
    
    return {
      overallScore: Math.round(overallScore),
      confidence: Math.round(confidence),
      isValid: overallScore >= 60,
      category,
      results,
      recommendations,
      marketPotential: Math.round(results.marketReadiness.score),
      technicalFeasibility: Math.round(results.technicalFeasibility.score),
      businessViability: Math.round(results.businessViability.score)
    };
  }
  
  /**
   * Validate startup name
   */
  private static validateName(name: string): ValidationResult {
    const issues: string[] = [];
    const suggestions: string[] = [];
    let score = 50;
    
    // Length validation
    if (name.length < 2) {
      issues.push('Name too short');
      suggestions.push('Use a more descriptive name (at least 2 characters)');
    } else if (name.length > 50) {
      issues.push('Name too long');
      suggestions.push('Shorten the name to under 50 characters');
    } else {
      score += 20;
    }
    
    // Clarity and professionalism
    if (/^[A-Z]/.test(name)) score += 10; // Starts with capital
    if (!/[^a-zA-Z0-9\s\-\.]/.test(name)) score += 10; // No special chars
    if (name.split(' ').length <= 4) score += 10; // Not too many words
    
    return {
      score: Math.min(100, score),
      isValid: score >= 60,
      confidence: 90,
      issues,
      suggestions,
      keywords: []
    };
  }
  
  /**
   * Validate description quality and detail
   */
  private static validateDescription(description: string): ValidationResult {
    const issues: string[] = [];
    const suggestions: string[] = [];
    let score = 30;
    
    // Length validation
    if (description.length < 50) {
      issues.push('Description too brief');
      suggestions.push('Provide more details about the solution and problem being solved');
    } else if (description.length >= 100) {
      score += 20;
      if (description.length >= 200) score += 10;
      if (description.length >= 300) score += 10;
    }
    
    // Content quality indicators
    const sentences = description.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length >= 3) score += 15; // Multiple sentences
    
    // Problem-solution articulation
    if (/(problem|challenge|issue|pain point)/i.test(description)) score += 10;
    if (/(solution|solve|address|tackle)/i.test(description)) score += 10;
    if (/(benefit|impact|value|advantage)/i.test(description)) score += 10;
    
    if (score < 60) {
      suggestions.push('Clearly articulate the problem, solution, and benefits');
    }
    
    return {
      score: Math.min(100, score),
      isValid: score >= 60,
      confidence: 85,
      issues,
      suggestions,
      keywords: []
    };
  }
  
  /**
   * Validate website URL
   */
  private static validateWebsite(website: string): ValidationResult {
    const issues: string[] = [];
    const suggestions: string[] = [];
    let score = 0;
    
    if (!website) {
      issues.push('No website provided');
      suggestions.push('Add a company website for credibility');
      return { score: 0, isValid: false, confidence: 100, issues, suggestions, keywords: [] };
    }
    
    // URL format validation
    if (website.startsWith('http') || website.includes('.')) {
      score += 50;
      
      // Additional quality checks
      if (website.startsWith('https://')) score += 20; // Secure
      if (!website.includes('wix') && !website.includes('wordpress.com')) score += 15; // Custom domain
      if (website.length < 100) score += 15; // Reasonable length
    } else {
      issues.push('Invalid website format');
      suggestions.push('Provide a valid website URL (e.g., https://example.com)');
    }
    
    return {
      score: Math.min(100, score),
      isValid: score >= 40,
      confidence: 95,
      issues,
      suggestions,
      keywords: []
    };
  }
  
  /**
   * Validate agritech focus and relevance
   */
  private static validateAgritechFocus(text: string): ValidationResult {
    const issues: string[] = [];
    const suggestions: string[] = [];
    const foundKeywords: string[] = [];
    let score = 0;
    
    // Check each category of agritech keywords
    let categoryMatches = 0;
    
    Object.entries(AGRITECH_KEYWORDS).forEach(([category, keywords]) => {
      const matches = keywords.filter(keyword => text.includes(keyword));
      if (matches.length > 0) {
        foundKeywords.push(...matches);
        categoryMatches++;
        score += Math.min(20, matches.length * 5); // Up to 20 points per category
      }
    });
    
    // Bonus for multiple categories
    if (categoryMatches >= 2) score += 15;
    if (categoryMatches >= 3) score += 10;
    
    if (foundKeywords.length === 0) {
      issues.push('No clear agritech focus detected');
      suggestions.push('Include specific agricultural problems, crops, or farming methods');
      suggestions.push('Mention target agricultural sector (crops, livestock, etc.)');
    } else if (foundKeywords.length < 3) {
      suggestions.push('Provide more specific details about the agricultural focus');
    }
    
    return {
      score: Math.min(100, score),
      isValid: score >= 40,
      confidence: 90,
      issues,
      suggestions,
      keywords: foundKeywords
    };
  }
  
  /**
   * Validate market readiness and business indicators
   */
  private static validateMarketReadiness(text: string): ValidationResult {
    const issues: string[] = [];
    const suggestions: string[] = [];
    const foundKeywords: string[] = [];
    let score = 40; // Base score
    
    // Check for market indicators
    MARKET_INDICATORS.forEach(indicator => {
      if (text.includes(indicator)) {
        foundKeywords.push(indicator);
        score += 8;
      }
    });
    
    // Customer validation indicators
    if (/(customer|client|user).*validation/i.test(text)) score += 15;
    if (/(pilot|trial|test|mvp)/i.test(text)) score += 10;
    if (/(revenue|sales|profit)/i.test(text)) score += 15;
    
    if (foundKeywords.length === 0) {
      issues.push('Limited market validation indicators');
      suggestions.push('Mention target customers, market size, or business model');
      suggestions.push('Include information about revenue potential or traction');
    }
    
    return {
      score: Math.min(100, score),
      isValid: score >= 50,
      confidence: 80,
      issues,
      suggestions,
      keywords: foundKeywords
    };
  }
  
  /**
   * Validate technical feasibility
   */
  private static validateTechnicalFeasibility(text: string): ValidationResult {
    const issues: string[] = [];
    const suggestions: string[] = [];
    const foundKeywords: string[] = [];
    let score = 50; // Base score
    
    // Check for technical indicators
    TECH_INDICATORS.forEach(indicator => {
      if (text.includes(indicator)) {
        foundKeywords.push(indicator);
        score += 6;
      }
    });
    
    // Innovation indicators
    if (/(patent|ip|intellectual property)/i.test(text)) score += 15;
    if (/(research|development|r&d)/i.test(text)) score += 10;
    if (/(algorithm|ai|machine learning)/i.test(text)) score += 10;
    
    if (foundKeywords.length < 2) {
      suggestions.push('Describe the technology or technical approach');
      suggestions.push('Mention technical differentiators or innovations');
    }
    
    return {
      score: Math.min(100, score),
      isValid: score >= 60,
      confidence: 75,
      issues,
      suggestions,
      keywords: foundKeywords
    };
  }
  
  /**
   * Validate business viability
   */
  private static validateBusinessViability(text: string): ValidationResult {
    const issues: string[] = [];
    const suggestions: string[] = [];
    const foundKeywords: string[] = [];
    let score = 45; // Base score
    
    // Check for quality indicators
    QUALITY_INDICATORS.forEach(indicator => {
      if (text.includes(indicator)) {
        foundKeywords.push(indicator);
        score += 7;
      }
    });
    
    // Business model indicators
    if (/(business model|revenue model)/i.test(text)) score += 15;
    if (/(scalable|scale)/i.test(text)) score += 10;
    if (/(partnership|collaborate)/i.test(text)) score += 10;
    
    if (foundKeywords.length < 2) {
      suggestions.push('Mention team experience or business credentials');
      suggestions.push('Describe business model or revenue strategy');
    }
    
    return {
      score: Math.min(100, score),
      isValid: score >= 55,
      confidence: 70,
      issues,
      suggestions,
      keywords: foundKeywords
    };
  }
  
  /**
   * Generate comprehensive recommendations
   */
  private static generateRecommendations(results: Record<string, ValidationResult>): string[] {
    const recommendations: string[] = [];
    
    // Collect all suggestions
    Object.values(results).forEach(result => {
      recommendations.push(...result.suggestions);
    });
    
    // Add strategic recommendations based on overall analysis
    const agritechScore = results.agritechFocus.score;
    const marketScore = results.marketReadiness.score;
    
    if (agritechScore < 60) {
      recommendations.push('🌱 Strengthen agricultural focus by clearly defining the farming problem being solved');
    }
    
    if (marketScore < 60) {
      recommendations.push('📈 Enhance market validation by including customer research or pilot results');
    }
    
    if (agritechScore >= 80 && marketScore >= 70) {
      recommendations.push('🚀 Strong foundation! Consider expanding on competitive advantages');
    }
    
    // Remove duplicates and limit to most important
    return Array.from(new Set(recommendations)).slice(0, 6);
  }
}