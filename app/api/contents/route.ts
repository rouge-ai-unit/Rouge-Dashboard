import { getDb } from "@/utils/dbConfig";
import { LinkedinContent } from "@/utils/schema";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/apiAuth";

export async function GET(req: NextRequest) {
  try {
    await requireSession();
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    
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
    
    const db = getDb();
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
