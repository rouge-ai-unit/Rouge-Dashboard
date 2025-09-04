import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '../../../../../utils/dbConfig';
import { AgritechStartups } from '../../../../../utils/schema';
import { eq } from 'drizzle-orm';

// POST /api/tools/startup-seeker/reality-check
// Perform reality check validation on a startup
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { startupName, startupDescription, startupWebsite, deepAnalysis = false } = await request.json();

    if (!startupName || !startupDescription) {
      return NextResponse.json(
        { error: 'Startup name and description are required' },
        { status: 400 }
      );
    }

    const userId = session.user.email;

    // Perform basic validation
    const validationResults = {
      name: {
        isValid: startupName.length >= 2 && startupName.length <= 100,
        score: startupName.length >= 2 && startupName.length <= 100 ? 100 : 0,
        issues: [] as string[]
      },
      description: {
        isValid: startupDescription.length >= 50,
        score: Math.min(100, (startupDescription.length / 200) * 100),
        issues: [] as string[]
      },
      website: {
        isValid: startupWebsite && (startupWebsite.startsWith('http') || startupWebsite.includes('.')),
        score: startupWebsite && (startupWebsite.startsWith('http') || startupWebsite.includes('.')) ? 100 : 0,
        issues: [] as string[]
      },
      agritechFocus: {
        isValid: false,
        score: 0,
        issues: [] as string[]
      },
      marketReadiness: {
        isValid: false,
        score: 0,
        issues: [] as string[]
      }
    };

    // Check for agritech keywords
    const agritechKeywords = [
      'agri', 'farm', 'agriculture', 'agricultural', 'crop', 'livestock', 'aqua', 'fish', 'plant', 'soil',
      'harvest', 'organic', 'sustainable', 'precision farming', 'smart farming', 'vertical farm',
      'hydroponics', 'aquaponics', 'agtech', 'foodtech', 'seed', 'fertilizer', 'pesticide',
      'irrigation', 'greenhouse', 'dairy', 'poultry', 'cattle', 'pig', 'swine', 'beef', 'chicken',
      'rice', 'wheat', 'corn', 'soy', 'vegetable', 'fruit', 'grain', 'cereal', 'biomass'
    ];

    const combinedText = `${startupName} ${startupDescription}`.toLowerCase();
    const hasAgritechKeywords = agritechKeywords.some(keyword => combinedText.includes(keyword));

    validationResults.agritechFocus.isValid = hasAgritechKeywords;
    validationResults.agritechFocus.score = hasAgritechKeywords ? 100 : 0;

    if (!hasAgritechKeywords) {
      validationResults.agritechFocus.issues.push('No clear agritech focus detected');
    }

    // Market readiness assessment
    const marketKeywords = ['market', 'customer', 'revenue', 'funding', 'investment', 'traction', 'users', 'scale'];
    const hasMarketKeywords = marketKeywords.some(keyword => combinedText.includes(keyword));

    validationResults.marketReadiness.isValid = hasMarketKeywords;
    validationResults.marketReadiness.score = hasMarketKeywords ? 80 : 40;

    if (!hasMarketKeywords) {
      validationResults.marketReadiness.issues.push('Limited market validation indicators');
    }

    // Calculate overall score
    const overallScore = Math.round(
      (validationResults.name.score +
       validationResults.description.score +
       validationResults.website.score +
       validationResults.agritechFocus.score +
       validationResults.marketReadiness.score) / 5
    );

    // Generate recommendations
    const recommendations = [];
    if (!validationResults.name.isValid) {
      recommendations.push('Consider a more descriptive startup name');
    }
    if (!validationResults.description.isValid) {
      recommendations.push('Expand the description with more details about the solution');
    }
    if (!validationResults.website.isValid) {
      recommendations.push('Ensure the website URL is valid and accessible');
    }
    if (!validationResults.agritechFocus.isValid) {
      recommendations.push('Clarify the agritech focus and agricultural problem being solved');
    }
    if (!validationResults.marketReadiness.isValid) {
      recommendations.push('Add information about market validation, customers, or traction');
    }

    const result = {
      overallScore,
      isValid: overallScore >= 60,
      validationResults,
      recommendations,
      summary: overallScore >= 80 ? 'Excellent startup profile' :
               overallScore >= 60 ? 'Good startup profile with room for improvement' :
               'Needs significant improvement'
    };

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error performing reality check:', error);
    return NextResponse.json(
      { error: 'Failed to perform reality check' },
      { status: 500 }
    );
  }
}
