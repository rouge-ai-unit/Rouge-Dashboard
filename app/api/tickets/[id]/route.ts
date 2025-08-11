import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/utils/dbConfig";
import { Tickets } from "@/utils/schema";
import { eq } from "drizzle-orm";
import { requireSession } from "@/lib/apiAuth";

type RouteCtx = unknown;

const allowed = [
  "title",
  "description",
  "criticality",
  "requestedBy",
  "status",
  "problemStatement",
  "expectedOutcome",
  "dataSources",
  "constraints",
  "manualSteps",
  "agentBreakdown",
  "dueDate",
  "impact",
] as const;

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  try {
    await requireSession();
  const db = getDb();
  const rawParams = (ctx as { params?: { id: string } | Promise<{ id: string }> } | undefined)?.params;
  const isPromise = typeof (rawParams as Promise<unknown> | undefined)?.then === "function";
  const resolved = isPromise ? await (rawParams as Promise<{ id: string }>) : (rawParams as { id: string } | undefined);
  const id = resolved?.id;
  if (!id) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    const body = await req.json();
    const updateData: Record<string, unknown> = {};
    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(body, key)) {
        updateData[key] = body[key as keyof typeof body];
      }
    }
    const updated = await db.update(Tickets).set(updateData).where(eq(Tickets.id, id)).returning();
    return NextResponse.json(updated[0] ?? null);
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error(e);
    return NextResponse.json({ error: "Failed to update ticket" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: RouteCtx) {
  try {
    await requireSession();
  const db = getDb();
  const rawParams = (ctx as { params?: { id: string } | Promise<{ id: string }> } | undefined)?.params;
  const isPromise = typeof (rawParams as Promise<unknown> | undefined)?.then === "function";
  const resolved = isPromise ? await (rawParams as Promise<{ id: string }>) : (rawParams as { id: string } | undefined);
  const id = resolved?.id;
  if (!id) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    await db.delete(Tickets).where(eq(Tickets.id, id));
    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error(e);
    return NextResponse.json({ error: "Failed to delete ticket" }, { status: 500 });
  }
}
