import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/utils/dbConfig";
import { LinkedinContent } from "@/utils/schema";
import { requireSession } from "@/lib/apiAuth";
import { randomUUID } from "crypto";

function hkDateString(d: Date) {
  const utc = d.getTime() + d.getTimezoneOffset() * 60000;
  const hk = new Date(utc + 8 * 60 * 60 * 1000);
  return hk.toISOString().split("T")[0];
}

export async function POST(req: NextRequest) {
  try {
    await requireSession();
    const body = (await req.json().catch(() => ({}))) as {
      from?: string;
      to?: string;
      excludeTitlesCsv?: string;
    };

    // Determine date range: default 6 days starting today (HK)
    const start = body.from ? new Date(body.from) : new Date();
    const end = body.to ? new Date(body.to) : new Date(start.getTime());
    if (!body.to) end.setDate(start.getDate() + 5);
    const from = hkDateString(start);
    const to = hkDateString(end);

    // Try Gemini first; fall back to a deterministic generator
    let generated: Array<{
      dayOfMonth: number;
      weekOfMonth: number;
      date: string;
      specialOccasion?: string | null;
      generalTheme: string;
      postIdeas: string;
      caption: string;
      hashtags: string;
    }> = [];

    const hasGemini = !!process.env.NEXT_PUBLIC_GEMINI;
    if (hasGemini) {
      try {
        const { GoogleGenerativeAI } = await import("@google/generative-ai");
        const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI as string);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const prompt = `Generate 6 LinkedIn content items for AgTech between ${from} and ${to}.
Return ONLY a JSON array with objects having: dayOfMonth, weekOfMonth, date (YYYY-MM-DD), specialOccasion, generalTheme, postIdeas, caption (no hashtags), hashtags (comma-separated string).`;
        const res = await model.generateContent(prompt);
        let text = (await res.response.text()).trim();
        text = String(text).replace(/```json\n?|```/g, "").trim();
        if (text.startsWith("[") && text.endsWith("]")) {
          text = text.replace(/,\s*([}\]])/g, "$1");
          const arr = JSON.parse(text) as any[];
          generated = arr.map((x) => ({
            dayOfMonth: Number(x.dayOfMonth),
            weekOfMonth: Number(x.weekOfMonth),
            date: String(x.date),
            specialOccasion: (x.specialOccasion ?? null) as string | null,
            generalTheme: String(x.generalTheme),
            postIdeas: String(x.postIdeas),
            caption: String(x.caption),
            hashtags: String(x.hashtags),
          }));
        }
      } catch (e) {
        console.warn("Gemini generation failed, falling back:", e);
      }
    }

    if (!generated.length) {
      // Fallback: deterministic placeholder ideas
      const startD = new Date(from);
      for (let i = 0; i < 6; i++) {
        const d = new Date(startD);
        d.setDate(startD.getDate() + i);
        const dateStr = hkDateString(d);
        const day = d.getDate();
        const week = Math.ceil(day / 7);
        generated.push({
          dayOfMonth: day,
          weekOfMonth: week,
          date: dateStr,
          specialOccasion: i === 3 ? "AgTech Awareness Day" : "",
          generalTheme: `AgTech Insight ${i + 1}`,
          postIdeas: `Tip ${i + 1}: Practical advice for agtech ops`,
          caption: `AgTech note ${i + 1}: moving from idea to impact.`,
          hashtags: "#AgTech, #Sustainability, #Innovation",
        });
      }
    }

    const db = getDb();
    // Pull existing for dedupe by date
    const existing = await db.select().from(LinkedinContent);
    const existingDates = new Set(existing.map((e) => e.date));
    const toInsert = generated.filter((g) => !existingDates.has(g.date));
    
    try {
      const inserted = await Promise.all(
        toInsert.map((g) => db.insert(LinkedinContent).values({ ...g, status: "Draft" }).returning().then((r) => r[0]))
      );
      return NextResponse.json(inserted, { status: 201 });
    } catch {
      const inserted = await Promise.all(
        toInsert.map((g) => db.insert(LinkedinContent).values(g).returning().then((r) => r[0]))
      );
      return NextResponse.json(inserted, { status: 201 });
    }
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to generate content" }, { status: 500 });
  }
}
