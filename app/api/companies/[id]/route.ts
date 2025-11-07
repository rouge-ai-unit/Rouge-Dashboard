import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/utils/dbConfig";
import { Companies } from "@/utils/schema";
import { eq } from "drizzle-orm";
import { requireSession } from "@/lib/apiAuth";

type RouteCtx = unknown;

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  try {
    await requireSession();
    const rawParams = (ctx as { params?: { id: string } | Promise<{ id: string }> } | undefined)?.params;
    const isPromise = typeof (rawParams as Promise<unknown> | undefined)?.then === "function";
    const resolved = isPromise
      ? await (rawParams as Promise<{ id: string }>)
      : (rawParams as { id: string } | undefined);
    const id = resolved?.id;
    if (!id) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    const data = await req.json();

    const db = getDb();

    const allowed = [
      "companyName",
      "companyWebsite",
      "companyLinkedin",
      "region",
      "industryFocus",
      "offerings",
      "marketingPosition",
      "potentialPainPoints",
      "contactName",
      "contactPosition",
      "linkedin",
      "contactEmail",
      "isMailed",
      "addedToMailList",
    ] as const;

    const updateData: Record<string, unknown> = {};
    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        updateData[key] = (data as Record<string, unknown>)[key];
      }
    }

    const updated = await db
      .update(Companies)
      .set(updateData)
      .where(eq(Companies.id, id))
      .returning();

    return NextResponse.json(updated[0] ?? null);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("PATCH /api/companies/[id] error:", error);
    return NextResponse.json({ error: "Failed to update company" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: RouteCtx) {
  try {
    await requireSession();
    const rawParams = (ctx as { params?: { id: string } | Promise<{ id: string }> } | undefined)?.params;
    const isPromise = typeof (rawParams as Promise<unknown> | undefined)?.then === "function";
    const resolved = isPromise
      ? await (rawParams as Promise<{ id: string }>)
      : (rawParams as { id: string } | undefined);
    const id = resolved?.id;
    if (!id) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    
    const db = getDb();
    await db.delete(Companies).where(eq(Companies.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("DELETE /api/companies/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete company" }, { status: 500 });
  }
}
