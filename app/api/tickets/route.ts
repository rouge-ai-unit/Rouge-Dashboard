import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/utils/dbConfig";
import { Tickets } from "@/utils/schema";
// NOTE: If you see Drizzle type errors about 'criticality', restart your dev server after schema changes.
import { z } from "zod";
import { requireSession } from "@/lib/apiAuth";

export async function GET() {
  try {
  await requireSession();
    const db = getDb();
    const rows = await db.select().from(Tickets).orderBy(Tickets.title);
    return NextResponse.json({ tickets: rows });
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
  criticality: z.string().optional().default("Medium"),
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
      criticality: parsed.criticality ?? "Medium",
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

    const db = getDb();
    const inserted = await db.insert(Tickets).values(valuesToInsert).returning();
    const created = inserted[0];
    
    // Fire-and-forget Slack webhook if configured
    notifySlack(created).catch(() => {});
    
    // Ticket saved to database - admins can view in /admin/support
    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error(e);
    return NextResponse.json({ error: "Failed to create ticket" }, { status: 400 });
  }
}

async function notifySlack(ticket: any) {
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
