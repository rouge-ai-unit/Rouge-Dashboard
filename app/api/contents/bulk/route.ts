import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/utils/dbConfig";
import { LinkedinContent } from "@/utils/schema";
import { requireSession } from "@/lib/apiAuth";
import { inArray } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    await requireSession();
    const body = (await req.json()) as { action: "delete" | "regenerate"; ids?: string[]; from?: string; to?: string };

    if (body.action === "delete") {
      const ids = body.ids ?? [];
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
