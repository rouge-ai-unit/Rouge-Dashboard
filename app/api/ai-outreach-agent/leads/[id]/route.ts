import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/utils/dbConfig';
import { OutreachLeads, OutreachLists } from '@/utils/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const updateLeadSchema = z.object({
  status: z.enum(['active', 'contacted', 'responded', 'archived']).optional(),
  priority: z.number().min(1).max(5).optional(),
  tags: z.array(z.string()).optional(),
  contactInfo: z.object({
    email: z.string().email().optional(),
    linkedin: z.string().url().optional(),
    website: z.string().url().optional(),
    phone: z.string().optional(),
  }).optional(),
  notes: z.string().optional(),
  contactedAt: z.string().datetime().optional(),
  respondedAt: z.string().datetime().optional(),
});

export async function PATCH(
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

    const leadId = params.id;
    const body = await request.json();

    // Validate request body
    const validation = updateLeadSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.errors
        },
        { status: 400 }
      );
    }

    // Check if lead exists and belongs to user
    const [existingLead] = await db
      .select()
      .from(OutreachLeads)
      .where(and(
        eq(OutreachLeads.id, leadId),
        eq(OutreachLeads.userId, session.user.id)
      ));

    if (!existingLead) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (validation.data.status) updateData.status = validation.data.status;
    if (validation.data.priority) updateData.priority = validation.data.priority;
    if (validation.data.tags) updateData.tags = validation.data.tags;
    if (validation.data.contactInfo) updateData.contactInfo = validation.data.contactInfo;
    if (validation.data.notes !== undefined) updateData.notes = validation.data.notes;

    // Handle timestamp fields
    if (validation.data.contactedAt) {
      updateData.contactedAt = new Date(validation.data.contactedAt);
    }
    if (validation.data.respondedAt) {
      updateData.respondedAt = new Date(validation.data.respondedAt);
    }

    // Update the lead
    const [updatedLead] = await db
      .update(OutreachLeads)
      .set(updateData)
      .where(eq(OutreachLeads.id, leadId))
      .returning();

    return NextResponse.json({
      success: true,
      data: updatedLead,
    });

  } catch (error) {
    console.error('Update Lead API Error:', error);

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

    const leadId = params.id;

    // Check if lead exists and belongs to user
    const [existingLead] = await db
      .select()
      .from(OutreachLeads)
      .where(and(
        eq(OutreachLeads.id, leadId),
        eq(OutreachLeads.userId, session.user.id)
      ));

    if (!existingLead) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      );
    }

    // Delete the lead
    await db
      .delete(OutreachLeads)
      .where(eq(OutreachLeads.id, leadId));

    return NextResponse.json({
      success: true,
      message: 'Lead deleted successfully',
    });

  } catch (error) {
    console.error('Delete Lead API Error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}