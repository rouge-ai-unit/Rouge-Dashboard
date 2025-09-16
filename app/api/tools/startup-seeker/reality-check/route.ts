import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import { 
  createErrorResponse, 
  createSuccessResponse, 
  ValidationErrors,
  sanitizeInput,
  isRateLimited 
} from '../utils/response-helpers';
import { AgritechValidationEngine } from '../utils/agritech-validator';

// Validation schema for reality check request
const realityCheckSchema = z.object({
  startupName: z.string()
    .min(2, 'Startup name must be at least 2 characters')
    .max(100, 'Startup name must be less than 100 characters'),
  startupDescription: z.string()
    .min(20, 'Description must be at least 20 characters')
    .max(2000, 'Description must be less than 2000 characters'),
  startupWebsite: z.string().url('Invalid website URL').optional().or(z.literal('')),
  additionalInfo: z.string().max(1000, 'Additional info must be less than 1000 characters').optional(),
  deepAnalysis: z.boolean().default(false),
  includeMarketAnalysis: z.boolean().default(true),
  includeTechAnalysis: z.boolean().default(true)
});

/**
 * POST /api/tools/startup-seeker/reality-check
 * Perform comprehensive agritech startup validation using advanced algorithms
 * Enterprise-grade with ML-inspired validation engine
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Authentication check
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return createErrorResponse(
        ValidationErrors.UNAUTHORIZED.message,
        ValidationErrors.UNAUTHORIZED.code,
        ValidationErrors.UNAUTHORIZED.status
      );
    }

    const userId = session.user.email;

    // Rate limiting check for reality checks
    if (isRateLimited(userId, 'reality_check')) {
      return createErrorResponse(
        'Too many reality checks. Please wait before trying again.',
        ValidationErrors.RATE_LIMITED.code,
        ValidationErrors.RATE_LIMITED.status
      );
    }

    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return createErrorResponse(
        'Invalid JSON in request body',
        'INVALID_JSON',
        400
      );
    }

    const validation = realityCheckSchema.safeParse(body);
    if (!validation.success) {
      return createErrorResponse(validation.error);
    }

    const { 
      startupName, 
      startupDescription, 
      startupWebsite, 
      additionalInfo,
      deepAnalysis,
      includeMarketAnalysis,
      includeTechAnalysis 
    } = validation.data;

    // Sanitize inputs to prevent XSS and other security issues
    const cleanName = sanitizeInput(startupName);
    const cleanDescription = sanitizeInput(startupDescription);
    const cleanAdditionalInfo = additionalInfo ? sanitizeInput(additionalInfo) : '';

    console.log(`🔍 Reality check for "${cleanName}" by user ${userId}`);

    // Perform comprehensive validation using advanced engine
    const validationResult = AgritechValidationEngine.validateStartup(
      cleanName,
      cleanDescription,
      startupWebsite,
      cleanAdditionalInfo
    );

    // Generate industry insights if deep analysis is requested
    let industryInsights = {};
    if (deepAnalysis) {
      industryInsights = generateIndustryInsights(validationResult);
    }

    // Generate market analysis if requested
    let marketAnalysis = {};
    if (includeMarketAnalysis) {
      marketAnalysis = generateMarketAnalysis(validationResult);
    }

    // Generate technical analysis if requested
    let technicalAnalysis = {};
    if (includeTechAnalysis) {
      technicalAnalysis = generateTechnicalAnalysis(validationResult);
    }

    // Create comprehensive response
    const responseData = {
      validation: validationResult,
      insights: {
        ...(deepAnalysis && { industry: industryInsights }),
        ...(includeMarketAnalysis && { market: marketAnalysis }),
        ...(includeTechAnalysis && { technical: technicalAnalysis })
      },
      summary: generateExecutiveSummary(validationResult),
      nextSteps: generateNextSteps(validationResult),
      benchmarks: generateBenchmarks(validationResult)
    };

    console.log(`✅ Reality check completed for "${cleanName}" - Score: ${validationResult.overallScore}`);

    return createSuccessResponse(responseData, {
      processingTime: Date.now() - startTime
    });

  } catch (error) {
    console.error('Reality check API error:', error);
    return createErrorResponse(
      error instanceof Error ? error.message : 'Failed to perform reality check',
      'REALITY_CHECK_ERROR',
      500
    );
  }
}

/**
 * Generate industry-specific insights
 */
function generateIndustryInsights(validation: any) {
  const agritechKeywords = validation.results.agritechFocus.keywords;
  
  // Categorize the startup based on keywords
  let primaryCategory = 'General Agriculture';
  let subCategories: string[] = [];
  
  if (agritechKeywords.some((k: string) => ['crop', 'plant', 'seed'].includes(k))) {
    primaryCategory = 'Crop Technology';
    subCategories.push('Plant Sciences');
  }
  
  if (agritechKeywords.some((k: string) => ['livestock', 'dairy', 'cattle'].includes(k))) {
    primaryCategory = 'Livestock Technology';
    subCategories.push('Animal Health');
  }
  
  if (agritechKeywords.some((k: string) => ['precision', 'smart', 'iot', 'sensor'].includes(k))) {
    subCategories.push('Precision Agriculture');
  }
  
  if (agritechKeywords.some((k: string) => ['vertical', 'hydroponic', 'greenhouse'].includes(k))) {
    subCategories.push('Controlled Environment Agriculture');
  }

  return {
    primaryCategory,
    subCategories,
    marketSize: estimateMarketSize(primaryCategory),
    competitionLevel: assessCompetitionLevel(primaryCategory),
    growthTrend: 'Growing', // Could be enhanced with real market data
    keyTrends: getIndustryTrends(primaryCategory)
  };
}

/**
 * Generate market analysis
 */
function generateMarketAnalysis(validation: any) {
  const marketScore = validation.marketPotential;
  
  return {
    marketReadiness: {
      score: marketScore,
      level: marketScore >= 80 ? 'High' : marketScore >= 60 ? 'Medium' : 'Low',
      indicators: validation.results.marketReadiness.keywords
    },
    targetMarket: {
      size: marketScore >= 70 ? 'Large' : marketScore >= 50 ? 'Medium' : 'Small',
      accessibility: marketScore >= 80 ? 'Easy' : marketScore >= 60 ? 'Moderate' : 'Challenging'
    },
    commercialization: {
      timeline: marketScore >= 80 ? '6-12 months' : marketScore >= 60 ? '12-18 months' : '18+ months',
      barriers: validation.results.marketReadiness.issues
    }
  };
}

/**
 * Generate technical analysis
 */
function generateTechnicalAnalysis(validation: any) {
  const techScore = validation.technicalFeasibility;
  
  return {
    feasibility: {
      score: techScore,
      level: techScore >= 80 ? 'High' : techScore >= 60 ? 'Medium' : 'Low',
      indicators: validation.results.technicalFeasibility.keywords
    },
    innovation: {
      level: validation.results.agritechFocus.keywords.length >= 5 ? 'High' : 'Medium',
      differentiation: techScore >= 70 ? 'Strong' : 'Moderate'
    },
    development: {
      complexity: techScore >= 80 ? 'Low' : techScore >= 60 ? 'Medium' : 'High',
      timeline: techScore >= 80 ? '3-6 months' : techScore >= 60 ? '6-12 months' : '12+ months'
    }
  };
}

/**
 * Generate executive summary
 */
function generateExecutiveSummary(validation: any) {
  const score = validation.overallScore;
  const category = validation.category;
  
  let summary = '';
  
  switch (category) {
    case 'excellent':
      summary = 'Outstanding agritech startup with strong market potential and clear value proposition. Ready for investment consideration.';
      break;
    case 'good':
      summary = 'Solid agritech startup with good foundations. Minor improvements needed before market entry.';
      break;
    case 'fair':
      summary = 'Promising concept but requires significant development in key areas before becoming investment-ready.';
      break;
    case 'poor':
      summary = 'Early-stage concept that needs substantial work on market validation and technical feasibility.';
      break;
  }
  
  return {
    grade: category.toUpperCase(),
    score,
    description: summary,
    investmentReadiness: score >= 75 ? 'Ready' : score >= 60 ? 'Near Ready' : 'Not Ready',
    keyStrengths: getKeyStrengths(validation),
    mainConcerns: getMainConcerns(validation)
  };
}

/**
 * Generate next steps recommendations
 */
function generateNextSteps(validation: any) {
  const steps: string[] = [];
  
  if (validation.results.agritechFocus.score < 70) {
    steps.push('Clarify agricultural problem and target market segment');
  }
  
  if (validation.results.marketReadiness.score < 60) {
    steps.push('Conduct customer interviews and market validation');
  }
  
  if (validation.results.technicalFeasibility.score < 70) {
    steps.push('Develop technical proof of concept or prototype');
  }
  
  if (validation.results.businessViability.score < 60) {
    steps.push('Define business model and revenue strategy');
  }
  
  if (validation.overallScore >= 75) {
    steps.push('Prepare pitch deck and seek strategic partnerships');
    steps.push('Consider pilot projects with potential customers');
  }
  
  return steps.slice(0, 5); // Limit to top 5 next steps
}

/**
 * Generate benchmark comparisons
 */
function generateBenchmarks(validation: any) {
  return {
    industryAverage: 65,
    topQuartile: 85,
    yourScore: validation.overallScore,
    percentile: calculatePercentile(validation.overallScore),
    comparison: validation.overallScore >= 85 ? 'Top 25%' : 
                validation.overallScore >= 65 ? 'Above Average' : 'Below Average'
  };
}

// Helper functions
function estimateMarketSize(category: string): string {
  const marketSizes: Record<string, string> = {
    'Crop Technology': '$15-25B',
    'Livestock Technology': '$8-15B',
    'General Agriculture': '$10-20B'
  };
  return marketSizes[category] || '$5-10B';
}

function assessCompetitionLevel(category: string): string {
  const competition: Record<string, string> = {
    'Crop Technology': 'High',
    'Livestock Technology': 'Medium',
    'General Agriculture': 'Medium'
  };
  return competition[category] || 'Medium';
}

function getIndustryTrends(category: string): string[] {
  const trends: Record<string, string[]> = {
    'Crop Technology': ['AI-driven crop monitoring', 'Gene editing', 'Vertical farming'],
    'Livestock Technology': ['Animal welfare tech', 'Feed optimization', 'Health monitoring'],
    'General Agriculture': ['Sustainability focus', 'Climate adaptation', 'Supply chain traceability']
  };
  return trends[category] || ['Digital transformation', 'Sustainability', 'Data analytics'];
}

function getKeyStrengths(validation: any): string[] {
  const strengths: string[] = [];
  
  if (validation.results.agritechFocus.score >= 80) {
    strengths.push('Strong agricultural focus');
  }
  
  if (validation.results.marketReadiness.score >= 70) {
    strengths.push('Market-ready approach');
  }
  
  if (validation.results.technicalFeasibility.score >= 70) {
    strengths.push('Technically feasible solution');
  }
  
  if (validation.results.description.score >= 80) {
    strengths.push('Clear value proposition');
  }
  
  return strengths;
}

function getMainConcerns(validation: any): string[] {
  const concerns: string[] = [];
  
  if (validation.results.agritechFocus.score < 60) {
    concerns.push('Unclear agricultural focus');
  }
  
  if (validation.results.marketReadiness.score < 50) {
    concerns.push('Limited market validation');
  }
  
  if (validation.results.technicalFeasibility.score < 50) {
    concerns.push('Technical feasibility questions');
  }
  
  return concerns;
}

function calculatePercentile(score: number): number {
  // Simple percentile calculation - could be enhanced with real data
  return Math.min(99, Math.max(1, Math.round(score * 0.9 + 10)));
}
