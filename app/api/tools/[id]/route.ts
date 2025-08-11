import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/utils/dbConfig";
import { Tools } from "@/utils/schema";
import { eq } from "drizzle-orm";
import { requireSession } from "@/lib/apiAuth";

const DEV_NO_DB = !process.env.DATABASE_URL && !process.env.NEXT_PUBLIC_DATABASE_URL;
type ToolItem = {
  id: string;
  name: string;
  href: string;
  description: string;
  unit?: string | null;
  status: string;
  progress?: number | null;
  criticality?: string | null;
  owner?: string | null;
  eta?: string | null;
};
const globalAny = globalThis as unknown as { __tools_mem?: ToolItem[] };
globalAny.__tools_mem = globalAny.__tools_mem || [];
const mem: ToolItem[] = globalAny.__tools_mem;

const allowed = [
  "name",
  "href",
  "description",
  "unit",
  "status",
  "progress",
  "criticality",
] as const;

type RouteCtx = unknown;

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  try {
    await requireSession();
  const rawParams = (ctx as { params?: { id: string } | Promise<{ id: string }> } | undefined)?.params;
  const isPromise = typeof (rawParams as Promise<unknown> | undefined)?.then === "function";
  const resolved = isPromise ? await (rawParams as Promise<{ id: string }>) : (rawParams as { id: string } | undefined);
  const id = resolved?.id;
  if (!id) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    const body = await req.json();
    if (DEV_NO_DB) {
      const idx = mem.findIndex((x) => x.id === id);
      if (idx < 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
      const updated = { ...mem[idx] } as Record<string, unknown>;
      for (const key of allowed) {
        if (Object.prototype.hasOwnProperty.call(body, key)) {
          updated[key] = (body as Record<string, unknown>)[key];
        }
      }
      mem[idx] = updated as ToolItem;
      return NextResponse.json(mem[idx]);
    }
    const db = getDb();
    const updateData: Record<string, unknown> = {};
    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(body, key)) {
        updateData[key] = body[key as keyof typeof body];
      }
    }
    const updated = await db
      .update(Tools)
      .set(updateData)
      .where(eq(Tools.id, id))
      .returning();
    return NextResponse.json(updated[0] ?? null);
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error(e);
    return NextResponse.json({ error: "Failed to update tool" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: RouteCtx) {
  try {
    await requireSession();
  const rawParams = (ctx as { params?: { id: string } | Promise<{ id: string }> } | undefined)?.params;
  const isPromise = typeof (rawParams as Promise<unknown> | undefined)?.then === "function";
  const resolved = isPromise ? await (rawParams as Promise<{ id: string }>) : (rawParams as { id: string } | undefined);
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
    await db.delete(Tools).where(eq(Tools.id, id));
    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error(e);
    return NextResponse.json({ error: "Failed to delete tool" }, { status: 500 });
  }
}
