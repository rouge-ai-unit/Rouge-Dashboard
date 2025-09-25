import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { simpleRateLimit } from '@/lib/rate-limit';
import { getTemplatesByUserId, Template } from '@/lib/cold-outreach/templates';

interface TemplateMetrics {
  totalTemplates: number;
  activeTemplates: number;
  totalUsage: number;
  avgPerformance: {
    openRate: number;
    clickRate: number;
    replyRate: number;
    conversionRate: number;
  };
  topTemplates: Array<{
    id: string;
    name: string;
    usageCount: number;
    performance: number;
  }>;
  categoryBreakdown: Array<{
    category: string;
    count: number;
    avgPerformance: number;
  }>;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting
    const rateLimitResult = await simpleRateLimit(session.user.id, 'templates_metrics', 30);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    // Get all templates for metrics calculation
// Define a proper interface for templates with metrics
interface TemplateWithMetrics extends Template {
  usageCount?: number;
  performance?: {
    openRate?: number;
    clickRate?: number;
    replyRate?: number;
    conversionRate?: number;
  };
  category?: string;
}

// Get all templates for metrics calculation
const templates: TemplateWithMetrics[] = await getTemplatesByUserId(session.user.id, {
  limit: 1000, // Get all templates for accurate metrics
  offset: 0,
});

// Calculate metrics
const totalTemplates = templates.length;
const activeTemplates = templates.filter(t => (t.usageCount ?? 0) > 0).length;
const totalUsage = templates.reduce((sum, t) => sum + ((t as any).usageCount || 0), 0);    // Calculate average performance
    const templatesWithPerformance = templates.filter(t => (t as any).performance);
    const avgPerformance = {
      openRate: templatesWithPerformance.length > 0
        ? templatesWithPerformance.reduce((sum, t) => sum + ((t as any).performance?.openRate || 0), 0) / templatesWithPerformance.length
        : 0,
      clickRate: templatesWithPerformance.length > 0
        ? templatesWithPerformance.reduce((sum, t) => sum + ((t as any).performance?.clickRate || 0), 0) / templatesWithPerformance.length
        : 0,
      replyRate: templatesWithPerformance.length > 0
        ? templatesWithPerformance.reduce((sum, t) => sum + ((t as any).performance?.replyRate || 0), 0) / templatesWithPerformance.length
        : 0,
      conversionRate: templatesWithPerformance.length > 0
        ? templatesWithPerformance.reduce((sum, t) => sum + ((t as any).performance?.conversionRate || 0), 0) / templatesWithPerformance.length
        : 0,
    };

    // Top performing templates
    const topTemplates = templates
      .filter(t => (t as any).performance?.openRate)
      .sort((a, b) => ((b as any).performance?.openRate || 0) - ((a as any).performance?.openRate || 0))
      .slice(0, 5)
      .map(t => ({
        id: t.id!,
        name: t.name,
        usageCount: (t as any).usageCount || 0,
        performance: (t as any).performance?.openRate || 0,
      }));

    // Category breakdown
    const categoryMap = new Map<string, { count: number; totalPerformance: number; templates: number }>();
    templates.forEach(t => {
      const category = (t as any).category || 'General';
      const current = categoryMap.get(category) || { count: 0, totalPerformance: 0, templates: 0 };
      current.count += (t as any).usageCount || 0;
      current.totalPerformance += (t as any).performance?.openRate || 0;
      current.templates += 1;
      categoryMap.set(category, current);
    });

    const categoryBreakdown = Array.from(categoryMap.entries()).map(([category, data]) => ({
      category,
      count: data.count,
      avgPerformance: data.templates > 0 ? data.totalPerformance / data.templates : 0,
    }));

    const metrics: TemplateMetrics = {
      totalTemplates,
      activeTemplates,
      totalUsage,
      avgPerformance,
      topTemplates,
      categoryBreakdown,
    };

    return NextResponse.json({ metrics });
  } catch (error) {
    console.error('Error fetching template metrics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
