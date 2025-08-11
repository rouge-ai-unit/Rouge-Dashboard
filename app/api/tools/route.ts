import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/utils/dbConfig";
import { Tools } from "@/utils/schema";
import { z } from "zod";
import { requireSession } from "@/lib/apiAuth";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";

const DEV_NO_DB = !process.env.DATABASE_URL && !process.env.NEXT_PUBLIC_DATABASE_URL;
// Use a global singleton so [id] route and this index route share memory in dev
const globalAny = globalThis as unknown as { __tools_mem?: Array<{
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
}> };
// In-memory list (dev/no DB). Intentionally no seeds to keep data fully dynamic.
globalAny.__tools_mem = globalAny.__tools_mem || [];
const memTools: Array<{
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
}> = globalAny.__tools_mem;

// No clearing needed; when DB is present we read from DB and ignore memTools

export async function GET() {
  try {
  await requireSession();
    // Helper: check file/folder existence relative to project
    const exists = (rel: string) => {
      try {
        return fs.existsSync(path.join(process.cwd(), rel));
      } catch {
        return false;
      }
    };

    // Build a non-persistent default list by discovering available routes/features
    const discoveredDefaults = () => {
      const items: Array<{
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
      }> = [];

      // Analytics
      if (exists("app/(route)/stats/page.tsx")) {
        items.push({
          id: randomUUID(),
          name: "Analytics",
          href: "/stats",
          description: "KPIs and charts",
          unit: "Ops",
          status: "Available",
          progress: 100,
          criticality: "High",
        });
      }
      // Work Tracker
      if (exists("app/(route)/work-tracker/page.tsx")) {
        items.push({
          id: randomUUID(),
          name: "Work Tracker",
          href: "/work-tracker",
          description: "Track work and team updates",
          unit: "Ops",
          status: "Available",
          progress: 100,
          criticality: "Medium",
        });
      }
      // AI News Daily
      if (exists("app/(route)/tools/ai-news-daily") || exists("app/(route)/tools/ai-news-daily/page.tsx")) {
        items.push({
          id: randomUUID(),
          name: "AI News Daily",
          href: "/tools/ai-news-daily",
          description: "Daily AI news highlights",
          unit: "AI",
          status: "Available",
          progress: 100,
          criticality: "Medium",
        });
      }
      // Content Idea Automation
      if (exists("app/(route)/tools/content-idea-automation") || exists("app/(route)/tools/content-idea-automation/page.tsx")) {
        items.push({
          id: randomUUID(),
          name: "Content Idea Automation",
          href: "/tools/content-idea-automation",
          description: "LinkedIn content planner and generator",
          unit: "Marketing",
          status: "Available",
          progress: 100,
          criticality: "High",
        });
      }
      // ASEAN University Data Extractor (external)
      items.push({
        id: randomUUID(),
        name: "ASEAN University Data Extractor",
        href: "https://rouge-university-list.streamlit.app/",
        description: "External tool for ASEAN university data",
        unit: "Research",
        status: "Available",
        progress: 100,
        criticality: "Low",
      });

      return items;
    };

    // Public read so dashboard can show tools even before sign-in
    if (DEV_NO_DB) {
      if (memTools.length === 0) {
        // Populate in-memory list once per dev session so counts are visible without seeds
        memTools.push(...discoveredDefaults());
      }
      return NextResponse.json(memTools);
    }
    const db = getDb();
    const rows = await db.select().from(Tools).orderBy(Tools.name);
    if (!rows || rows.length === 0) {
      // If DB is empty, still return discovered tools (read-only, not persisted)
      return NextResponse.json(discoveredDefaults());
    }
    return NextResponse.json(rows);
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch tools" }, { status: 500 });
  }
}

const ToolCreate = z.object({
  name: z.string(),
  href: z.string(),
  description: z.string(),
  unit: z.string().optional().nullable(),
  status: z.string(),
  progress: z.number().int().min(0).max(100).optional(),
  criticality: z.string().optional(),
  owner: z.string().optional().nullable(),
  eta: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  try {
  await requireSession();
    const body = await req.json();
    const parsed = ToolCreate.parse(body);
    if (DEV_NO_DB) {
      const created = { id: randomUUID(), ...parsed };
      memTools.unshift(created);
      return NextResponse.json(created, { status: 201 });
    }
    const db = getDb();
    // Only persist columns that exist in the DB schema
    const { name, href, description, unit, status, progress, criticality } = parsed as {
      name: string; href: string; description: string; unit?: string | null; status: string; progress?: number | null; criticality?: string | null;
    };
    const inserted = await db.insert(Tools).values({ name, href, description, unit: unit ?? undefined, status, progress: (progress as number | undefined), criticality: criticality ?? undefined }).returning();
    return NextResponse.json(inserted[0], { status: 201 });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error(e);
    return NextResponse.json({ error: "Failed to create tool" }, { status: 400 });
  }
}
