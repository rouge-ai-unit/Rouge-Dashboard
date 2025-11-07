import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/utils/dbConfig";
import { LinkedinContent } from "@/utils/schema";
import { eq } from "drizzle-orm";
import { requireSession } from "@/lib/apiAuth";

type RouteCtx = unknown;

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  try {
    await requireSession();
    const rawParams = (ctx as { params?: { id: string } | Promise<{ id: string }> } | undefined)?.params;
    const isPromise = typeof (rawParams as Promise<unknown> | undefined)?.then === "function";
    const resolved = isPromise ? await (rawParams as Promise<{ id: string }>) : (rawParams as { id: string } | undefined);
    const id = resolved?.id;
    if (!id) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    const data = await req.json();

    const db = getDb();

    const updateData: Partial<{
      dayOfMonth: number;
      weekOfMonth: number;
      date: string;
      specialOccasion: string | null;
      generalTheme: string;
      postIdeas: string;
      caption: string;
      hashtags: string;
    }> = {};

    const allowed = [
      "dayOfMonth",
      "weekOfMonth",
      "date",
      "specialOccasion",
      "generalTheme",
      "postIdeas",
      "caption",
      "hashtags",
      "status",
    ] as const;

    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        (updateData as Record<string, unknown>)[key] = (data as Record<string, unknown>)[key];
      }
    }

    const updated = await db
      .update(LinkedinContent)
      .set(updateData)
      .where(eq(LinkedinContent.id, id))
      .returning();
    const row = updated[0] as any;
    return NextResponse.json(row ?? null);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("PATCH /api/contents/[id] error:", error);
    return NextResponse.json({ error: "Failed to update content" }, { status: 500 });
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
    
    const db = getDb();
    await db.delete(LinkedinContent).where(eq(LinkedinContent.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("DELETE /api/contents/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete content" }, { status: 500 });
  }
}
