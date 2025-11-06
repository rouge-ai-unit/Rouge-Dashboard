import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/utils/dbConfig';
import { OutreachLists, OutreachLeads } from '@/utils/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const listId = params.id;

    // Get the list
    const [list] = await db
      .select()
      .from(OutreachLists)
      .where(and(
        eq(OutreachLists.id, listId),
        eq(OutreachLists.userId, session.user.id)
      ));

    if (!list) {
      return NextResponse.json(
        { error: 'List not found' },
        { status: 404 }
      );
    }

    // Get the leads for this list
    const leads = await db
      .select()
      .from(OutreachLeads)
      .where(and(
        eq(OutreachLeads.listId, listId),
        eq(OutreachLeads.userId, session.user.id)
      ))
      .orderBy(OutreachLeads.createdAt);

    // Transform leads to match frontend interface
    const transformedLeads = leads.map(lead => ({
      id: lead.id,
      name: lead.name,
      type: lead.type,
      relevance: lead.relevance,
      outreach_suggestion: lead.outreachSuggestion,
    }));

    return NextResponse.json({
      success: true,
      data: {
        ...list,
        leads: transformedLeads,
      },
    });

  } catch (error) {
    console.error('Get Outreach List API Error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const listId = params.id;

    // Check if list exists and belongs to user
    const [existingList] = await db
      .select()
      .from(OutreachLists)
      .where(and(
        eq(OutreachLists.id, listId),
        eq(OutreachLists.userId, session.user.id)
      ));

    if (!existingList) {
      return NextResponse.json(
        { error: 'List not found' },
        { status: 404 }
      );
    }

    // Delete the list (leads will be cascade deleted due to foreign key constraint)
    await db
      .delete(OutreachLists)
      .where(eq(OutreachLists.id, listId));

    return NextResponse.json({
      success: true,
      message: 'List deleted successfully',
    });

  } catch (error) {
    console.error('Delete Outreach List API Error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}