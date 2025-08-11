import { getDb } from "@/utils/dbConfig";
import { LinkedinContent } from "@/utils/schema";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/apiAuth";
import { randomUUID } from "crypto";

const DEV_NO_DB = !process.env.DATABASE_URL && !process.env.NEXT_PUBLIC_DATABASE_URL;
type ContentItem = {
  id: string;
  dayOfMonth: number;
  weekOfMonth: number;
  date: string;
  specialOccasion?: string | null;
  generalTheme: string;
  postIdeas: string;
  caption: string;
  hashtags: string;
  status?: "Draft" | "Approved" | "Scheduled";
};
// Use a global singleton so [id] route and this index route share memory in dev
const globalAny = globalThis as unknown as { __contents_mem?: ContentItem[] };
globalAny.__contents_mem = globalAny.__contents_mem || [];
const memContents: ContentItem[] = globalAny.__contents_mem;

export async function GET(req: NextRequest) {
  try {
  await requireSession();
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    if (DEV_NO_DB) {
      const rows = memContents
        .filter((r) => {
          if (!from && !to) return true;
          const d = r.date;
          if (from && d < from) return false;
          if (to && d > to) return false;
          return true;
        })
  .sort((a, b) => a.date.localeCompare(b.date));
      return NextResponse.json(rows);
    }
    const db = getDb();
    const contents = await db
      .select()
      .from(LinkedinContent)
      .orderBy(LinkedinContent.date);
    const filtered = contents.filter((r) => {
      if (!from && !to) return true;
      const d = r.date as unknown as string;
      if (from && d < from) return false;
      if (to && d > to) return false;
      return true;
  });
    return NextResponse.json(filtered);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error fetching Content Details:", error);
    return NextResponse.json({ error: "Failed to fetch Content Details" }, { status: 500 });
  }
}

const ContentCreateSchema = z.object({
  dayOfMonth: z.number(),
  weekOfMonth: z.number(),
  date: z.string(),
  specialOccasion: z.string().optional().nullable(),
  generalTheme: z.string(),
  postIdeas: z.string(),
  caption: z.string(),
  hashtags: z.string(),
  status: z.enum(["Draft", "Approved", "Scheduled"]).optional(),
});

export async function POST(req: NextRequest) {
  try {
    await requireSession();
    const body = await req.json();
    const parsed = ContentCreateSchema.parse(body);
    if (DEV_NO_DB) {
      const created: ContentItem = { id: randomUUID(), status: parsed.status ?? "Draft", ...parsed };
      memContents.unshift(created);
      return NextResponse.json(created, { status: 201 });
    }
    const db = getDb();
    // Insert only DB columns; status is tracked in-memory until a migration adds it
    const { dayOfMonth, weekOfMonth, date, specialOccasion, generalTheme, postIdeas, caption, hashtags, status } = parsed;
    try {
      const inserted = await db
        .insert(LinkedinContent)
        .values({ dayOfMonth, weekOfMonth, date, specialOccasion, generalTheme, postIdeas, caption, hashtags, status: status ?? "Draft" })
        .returning();
      return NextResponse.json(inserted[0], { status: 201 });
    } catch (e) {
      // Fallback if status column is missing
      const inserted = await db
        .insert(LinkedinContent)
        .values({ dayOfMonth, weekOfMonth, date, specialOccasion, generalTheme, postIdeas, caption, hashtags })
        .returning();
      return NextResponse.json(inserted[0], { status: 201 });
    }
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error creating content:", error);
    return NextResponse.json({ error: "Failed to create content" }, { status: 400 });
  }
}
