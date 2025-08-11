import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/utils/dbConfig";
import { Companies } from "@/utils/schema";
import { eq } from "drizzle-orm";
import { requireSession } from "@/lib/apiAuth";

const DEV_NO_DB = !process.env.DATABASE_URL && !process.env.NEXT_PUBLIC_DATABASE_URL;
type CompanyItem = {
  id: string;
  companyName: string;
  companyWebsite?: string | null;
  companyLinkedin?: string | null;
  region: string;
  industryFocus: string;
  offerings: string;
  marketingPosition: string;
  potentialPainPoints: string;
  contactName: string;
  contactPosition: string;
  linkedin?: string | null;
  contactEmail: string;
  isMailed?: boolean;
  addedToMailList?: boolean;
};
const globalAny = globalThis as unknown as { __companies_mem?: CompanyItem[] };
globalAny.__companies_mem = globalAny.__companies_mem || [];
const mem: CompanyItem[] = globalAny.__companies_mem;

// Support Next.js variations where `params` may be an object or a Promise
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

    if (DEV_NO_DB) {
      const idx = mem.findIndex((x) => x.id === id);
      if (idx < 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
      const current = mem[idx];
      const updated = { ...current } as Record<string, unknown>;
      const allowedKeys = [
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
      for (const k of allowedKeys) {
        if (Object.prototype.hasOwnProperty.call(data, k)) {
          updated[k] = (data as Record<string, unknown>)[k];
        }
      }
      mem[idx] = updated as CompanyItem;
      return NextResponse.json(mem[idx]);
    }
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
    if (DEV_NO_DB) {
      const before = mem.length;
      const after = mem.filter((x) => x.id !== id);
      mem.length = 0;
      mem.push(...after);
      return NextResponse.json({ deleted: before - after.length });
    }
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
