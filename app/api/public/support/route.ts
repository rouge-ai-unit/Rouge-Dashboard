import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/utils/dbConfig';
import { Tickets } from '@/utils/schema';
import { z } from 'zod';

/**
 * Public Support API - No authentication required
 * Allows users to submit support requests before logging in
 * Tickets are stored in the same Tickets table and visible to admins
 */

const PublicSupportSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  subject: z.string().min(1, 'Subject is required'),
  message: z.string().min(20, 'Message must be at least 20 characters'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const parsed = PublicSupportSchema.parse(body);
    const { name, email, subject, message } = parsed;

    // Create ticket in the same Tickets table used by authenticated users
    const db = getDb();
    const ticketData = {
      title: `[Public Support] ${subject}`,
      description: `From: ${name} (${email})\n\n${message}`,
      requestedBy: email,
      status: 'Open',
      criticality: 'Medium',
      team: null,
      department: null,
      problemStatement: null,
      expectedOutcome: null,
      dataSources: null,
      constraints: null,
      manualSteps: null,
      agentBreakdown: null,
      dueDate: null,
      impact: null,
      businessGoal: null,
      businessSteps: null,
    };

    const inserted = await db.insert(Tickets).values(ticketData).returning();
    const created = inserted[0];

    // Optional: Fire-and-forget Slack notification if configured
    notifySlack(created, name).catch(() => {});

    return NextResponse.json({
      success: true,
      message: 'Support request submitted successfully. We will get back to you within 24-48 hours.',
      id: created.id,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message || 'Validation failed' },
        { status: 400 }
      );
    }
    
    console.error('[Public Support API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to submit support request. Please try again later.' },
      { status: 500 }
    );
  }
}

async function notifySlack(ticket: any, name: string) {
  const hook = process.env.SLACK_WEBHOOK_URL;
  if (!hook) return;
  
  const lines = [
    `:envelope: New Public Support Request`,
    `• From: ${name} (${ticket.requestedBy})`,
    `• Subject: ${ticket.title}`,
    `• Status: ${ticket.status}`,
    '',
    (ticket.description || '').slice(0, 1200),
  ].filter(Boolean);
  
  await fetch(hook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: lines.join('\n') }),
    cache: 'no-store',
  });
}
