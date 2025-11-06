import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { outreachService } from '@/lib/ai-outreach-agent';
import { getDb } from '@/utils/dbConfig';
import { OutreachLists, OutreachLeads } from '@/utils/schema';
import { LeadType } from '@/types/ai-outreach-agent';
import { eq, desc, sql } from 'drizzle-orm';
import { z } from 'zod';
import { createAdvancedRateLimiter } from '@/lib/rate-limit';

const generateSchema = z.object({
  companyDescription: z.string().min(50).max(2000),
  targetAudiences: z.array(z.nativeEnum(LeadType)).min(1).max(5),
  title: z.string().min(1).max(255).optional(),
});

// Rate limiting: 10 requests per hour per user
const limiter = createAdvancedRateLimiter({
  interval: 60 * 60 * 1000, // 1 hour
  maxRequestsPerInterval: 10,
  uniqueTokenPerInterval: 500,
});

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const db = getDb();

    // Rate limiting
    try {
      const result = await limiter.check(request);
      if (!result.allowed) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please try again later.' },
          { status: 429 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = generateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.errors
        },
        { status: 400 }
      );
    }

    const { companyDescription, targetAudiences, title } = validation.data;
    const userId = session.user.id;
    const listTitle = title || `Outreach List - ${new Date().toLocaleDateString()}`;

    // Create database record for the list
    const [newList] = await db.insert(OutreachLists).values({
      userId,
      title: listTitle,
      companyDescription,
      targetAudiences,
      status: 'generating',
      metadata: {
        aiModel: 'gemini-pro',
        cacheHit: false,
      },
    }).returning();

    // Generate leads using AI service
    const startTime = Date.now();
    let leads;

    try {
      leads = await outreachService.generateOutreachList({
        companyDescription,
        targetAudiences,
      });
    } catch (error) {
      // Update list status to failed
      await db.update(OutreachLists)
        .set({
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          updatedAt: new Date(),
        })
        .where(eq(OutreachLists.id, newList.id));

      throw error;
    }

    const processingTime = Date.now() - startTime;

    // Save leads to database
    const leadInserts = leads.map(lead => ({
      listId: newList.id,
      userId,
      name: lead.name,
      type: lead.type,
      relevance: lead.relevance,
      outreachSuggestion: lead.outreach_suggestion,
      priority: Math.floor(Math.random() * 3) + 3, // Random priority 3-5
    }));

    await db.insert(OutreachLeads).values(leadInserts);

    // Update list status to completed
    await db.update(OutreachLists)
      .set({
        status: 'completed',
        leadCount: leads.length,
        completedAt: new Date(),
        updatedAt: new Date(),
        metadata: {
          promptTokens: 0, // Would be populated from AI service
          completionTokens: 0,
          totalTokens: 0,
          processingTime,
          aiModel: 'gemini-pro',
          cacheHit: false,
        },
      })
      .where(eq(OutreachLists.id, newList.id));

    // Return the complete list with leads
    const [completeList] = await db
      .select()
      .from(OutreachLists)
      .where(eq(OutreachLists.id, newList.id));

    const listLeads = await db
      .select()
      .from(OutreachLeads)
      .where(eq(OutreachLeads.listId, newList.id))
      .orderBy(desc(OutreachLeads.priority));

    // Transform leads to include id field
    const transformedLeads = listLeads.map(lead => ({
      id: lead.id,
      name: lead.name,
      type: lead.type,
      relevance: lead.relevance,
      outreach_suggestion: lead.outreachSuggestion,
    }));

    return NextResponse.json({
      success: true,
      data: {
        list: completeList,
        leads: transformedLeads,
      },
    });

  } catch (error) {
    console.error('AI Outreach Agent API Error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const db = getDb();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    // Get user's outreach lists
    const lists = await db
      .select()
      .from(OutreachLists)
      .where(eq(OutreachLists.userId, session.user.id))
      .orderBy(desc(OutreachLists.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(OutreachLists)
      .where(eq(OutreachLists.userId, session.user.id));

    return NextResponse.json({
      success: true,
      data: {
        lists,
        pagination: {
          page,
          limit,
          total: count,
          pages: Math.ceil(count / limit),
        },
      },
    });

  } catch (error) {
    console.error('Get Outreach Lists API Error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}