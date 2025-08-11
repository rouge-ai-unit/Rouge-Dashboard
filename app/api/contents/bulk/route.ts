import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/utils/dbConfig";
import { LinkedinContent } from "@/utils/schema";
import { requireSession } from "@/lib/apiAuth";
import { inArray } from "drizzle-orm";

const DEV_NO_DB = !process.env.DATABASE_URL && !process.env.NEXT_PUBLIC_DATABASE_URL;

type ContentItem = {
  id: string;
  date: string;
};
const globalAny = globalThis as unknown as { __contents_mem?: ContentItem[] };
globalAny.__contents_mem = globalAny.__contents_mem || [];
const mem: ContentItem[] = globalAny.__contents_mem;

export async function POST(req: NextRequest) {
  try {
    await requireSession();
    const body = (await req.json()) as { action: "delete" | "regenerate"; ids?: string[]; from?: string; to?: string };

    if (body.action === "delete") {
      const ids = body.ids ?? [];
      if (DEV_NO_DB) {
        const set = new Set(ids);
        const after = mem.filter((x) => !set.has(x.id));
        mem.length = 0;
        mem.push(...after);
        return NextResponse.json({ deleted: ids.length });
      }
      const db = getDb();
      if (!ids.length) return NextResponse.json({ deleted: 0 });
      await db.delete(LinkedinContent).where(inArray(LinkedinContent.id, ids));
      return NextResponse.json({ deleted: ids.length });
    }

    if (body.action === "regenerate") {
      // Proxy to /api/contents/generate with range
      const base = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
      const res = await fetch(`${base}/api/contents/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: body.from, to: body.to }),
      });
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Bulk operation failed" }, { status: 500 });
  }
}
