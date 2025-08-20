import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/utils/dbConfig";
import { Tickets } from "@/utils/schema";
// NOTE: If you see Drizzle type errors about 'criticality', restart your dev server after schema changes.
import { z } from "zod";
import { requireSession } from "@/lib/apiAuth";

import { randomUUID } from "crypto";
import { sendTicketNotification } from '@/lib/sendgrid';

const DEV_NO_DB = !process.env.DATABASE_URL && !process.env.NEXT_PUBLIC_DATABASE_URL;
type TicketItem = {
  id: string;
  title: string;
  description: string;
  requestedBy: string;
  status: string;
  problemStatement?: string | null;
  expectedOutcome?: string | null;
  dataSources?: string | null;
  constraints?: string | null;
  manualSteps?: string | null;
  agentBreakdown?: string | null;
  dueDate?: string | null;
  impact?: string | null;
  attachments?: string[] | null;
  team?: string | null;
  department?: string | null;
  businessGoal?: string | null;
  businessSteps?: string | null;
};
const memTickets: TicketItem[] = [];

export async function GET() {
  try {
  await requireSession();
    if (DEV_NO_DB) {
      return NextResponse.json(memTickets);
    }
    const db = getDb();
    const rows = await db.select().from(Tickets).orderBy(Tickets.title);
    return NextResponse.json(rows);
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch tickets" }, { status: 500 });
  }
}

const TicketCreate = z.object({
  title: z.string(),
  description: z.string(),
  requestedBy: z.string(),
  status: z.string(),
  team: z.string().optional().nullable(),
  department: z.string().optional().nullable(),
  problemStatement: z.string().optional().nullable(),
  expectedOutcome: z.string().optional().nullable(),
  dataSources: z.string().optional().nullable(),
  constraints: z.string().optional().nullable(),
  manualSteps: z.string().optional().nullable(),
  agentBreakdown: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  impact: z.string().optional().nullable(),
  businessGoal: z.string().optional().nullable(),
  businessSteps: z.string().optional().nullable(),
  // Optional attachments (base64 data URLs) - ignored in DB insert
  attachments: z.array(z.string()).optional().nullable(),
});

export async function POST(req: NextRequest) {
  try {
  await requireSession();
    const body = await req.json();
    const parsed = TicketCreate.parse(body);
    const valuesToInsert = {
      title: parsed.title,
      description: parsed.description,
      requestedBy: parsed.requestedBy,
      status: parsed.status,
      team: parsed.team ?? null,
      department: parsed.department ?? null,
      problemStatement: parsed.problemStatement ?? null,
      expectedOutcome: parsed.expectedOutcome ?? null,
      dataSources: parsed.dataSources ?? null,
      constraints: parsed.constraints ?? null,
      manualSteps: parsed.manualSteps ?? null,
      agentBreakdown: parsed.agentBreakdown ?? null,
      dueDate: parsed.dueDate ?? null,
      impact: parsed.impact ?? null,
      businessGoal: parsed.businessGoal ?? null,
      businessSteps: parsed.businessSteps ?? null,
    };

    if (DEV_NO_DB) {
      const created: TicketItem = { id: randomUUID(), ...valuesToInsert, attachments: parsed.attachments ?? null };
      memTickets.unshift(created);
      // Fire-and-forget Slack webhook if configured
      notifySlack(created).catch(() => {});
      // Fire-and-forget SendGrid email
      sendTicketNotification({
        to: process.env.AI_TEAM_EMAIL || 'ai-team@example.com',
        subject: `New AI Team Ticket: ${created.title}`,
        text: `A new business support request has been submitted.\n\nTitle: ${created.title}\nRequested By: ${created.requestedBy}\nTeam: ${created.team || ''}\nDepartment: ${created.department || ''}\nBusiness Goal: ${created.businessGoal || ''}\nBusiness Steps: ${created.businessSteps || ''}\nDescription: ${created.description}\nDue Date: ${created.dueDate || ''}\n\nProblem Statement: ${created.problemStatement || ''}\nExpected Outcome: ${created.expectedOutcome || ''}\nData Sources: ${created.dataSources || ''}\nConstraints: ${created.constraints || ''}\nManual Steps: ${created.manualSteps || ''}`,
        html: `
          <h2>New Business Support Request</h2>
          <p><b>Title:</b> ${created.title}</p>
          <p><b>Requested By:</b> ${created.requestedBy}</p>
          <p><b>Team:</b> ${created.team || ''}</p>
          <p><b>Department:</b> ${created.department || ''}</p>
          <p><b>Business Goal:</b> ${created.businessGoal || ''}</p>
          <p><b>Business Steps:</b><br/>${(created.businessSteps || '').replace(/\n/g, '<br/>')}</p>
          <p><b>Description:</b><br/>${(created.description || '').replace(/\n/g, '<br/>')}</p>
          <p><b>Due Date:</b> ${created.dueDate || ''}</p>
          ${created.problemStatement ? `<p><b>Problem Statement:</b><br/>${created.problemStatement.replace(/\n/g, '<br/>')}</p>` : ''}
          ${created.expectedOutcome ? `<p><b>Expected Outcome:</b><br/>${created.expectedOutcome.replace(/\n/g, '<br/>')}</p>` : ''}
          ${created.dataSources ? `<p><b>Data Sources:</b><br/>${created.dataSources.replace(/\n/g, '<br/>')}</p>` : ''}
          ${created.constraints ? `<p><b>Constraints:</b><br/>${created.constraints.replace(/\n/g, '<br/>')}</p>` : ''}
          ${created.manualSteps ? `<p><b>Manual Steps:</b><br/>${created.manualSteps.replace(/\n/g, '<br/>')}</p>` : ''}
        `
      }).catch(() => {});
      return NextResponse.json(created, { status: 201 });
    }
    const db = getDb();
    const inserted = await db.insert(Tickets).values(valuesToInsert).returning();
    const created = inserted[0];
    notifySlack(created as unknown as TicketItem).catch(() => {});
    // Fire-and-forget SendGrid email
    sendTicketNotification({
      to: process.env.AI_TEAM_EMAIL || 'ai-team@example.com',
      subject: `New AI Team Ticket: ${created.title}`,
      text: `A new business support request has been submitted.\n\nTitle: ${created.title}\nRequested By: ${created.requestedBy}\nTeam: ${created.team || ''}\nDepartment: ${created.department || ''}\nBusiness Goal: ${created.businessGoal || ''}\nBusiness Steps: ${created.businessSteps || ''}\nDescription: ${created.description}\nDue Date: ${created.dueDate || ''}\n\nProblem Statement: ${created.problemStatement || ''}\nExpected Outcome: ${created.expectedOutcome || ''}\nData Sources: ${created.dataSources || ''}\nConstraints: ${created.constraints || ''}\nManual Steps: ${created.manualSteps || ''}`,
      html: `
        <h2>New Business Support Request</h2>
        <p><b>Title:</b> ${created.title}</p>
        <p><b>Requested By:</b> ${created.requestedBy}</p>
        <p><b>Team:</b> ${created.team || ''}</p>
        <p><b>Department:</b> ${created.department || ''}</p>
        <p><b>Business Goal:</b> ${created.businessGoal || ''}</p>
        <p><b>Business Steps:</b><br/>${(created.businessSteps || '').replace(/\n/g, '<br/>')}</p>
        <p><b>Description:</b><br/>${(created.description || '').replace(/\n/g, '<br/>')}</p>
        <p><b>Due Date:</b> ${created.dueDate || ''}</p>
        ${created.problemStatement ? `<p><b>Problem Statement:</b><br/>${created.problemStatement.replace(/\n/g, '<br/>')}</p>` : ''}
        ${created.expectedOutcome ? `<p><b>Expected Outcome:</b><br/>${created.expectedOutcome.replace(/\n/g, '<br/>')}</p>` : ''}
        ${created.dataSources ? `<p><b>Data Sources:</b><br/>${created.dataSources.replace(/\n/g, '<br/>')}</p>` : ''}
        ${created.constraints ? `<p><b>Constraints:</b><br/>${created.constraints.replace(/\n/g, '<br/>')}</p>` : ''}
        ${created.manualSteps ? `<p><b>Manual Steps:</b><br/>${created.manualSteps.replace(/\n/g, '<br/>')}</p>` : ''}
      `
    }).catch(() => {});
    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error(e);
    return NextResponse.json({ error: "Failed to create ticket" }, { status: 400 });
  }
}

async function notifySlack(ticket: TicketItem) {
  const hook = process.env.SLACK_WEBHOOK_URL;
  if (!hook) return;
  const lines = [
    `:ticket: New Ticket: *${ticket.title}*`,
    `• Requested by: ${ticket.requestedBy}`,
  `• Status: ${ticket.status}`,
    ticket.dueDate ? `• Due: ${ticket.dueDate}` : undefined,
    ticket.impact ? `• Impact: ${ticket.impact}` : undefined,
    "",
    (ticket.description || "").slice(0, 1200),
  ].filter(Boolean);
  await fetch(hook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: lines.join("\n") }),
    cache: "no-store",
  });
}
