import { getDb } from "@/utils/dbConfig";
import { WorkTracker } from "@/utils/schema";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { and, asc, count, desc, ilike, or, eq } from "drizzle-orm";

const getFormattedDate = () => new Date().toISOString().split("T")[0];

// GET route
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const q = (url.searchParams.get("q") || "").trim();
    const unit = url.searchParams.get("unit") || "";
    const status = url.searchParams.get("status") || "";
    const sort = (url.searchParams.get("sort") || "lastUpdated") as
      | "unit"
      | "task"
      | "assignedTo"
      | "status"
      | "deadline"
      | "workStart"
      | "memberUpdate"
      | "lastUpdated";
    const dir = (url.searchParams.get("dir") || "desc").toLowerCase() === "asc" ? "asc" : "desc";
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get("pageSize") || "10", 10) || 10));

    const db = getDb();

    const conds: unknown[] = [];
    if (unit) conds.push(eq(WorkTracker.unit, unit));
    if (status) conds.push(eq(WorkTracker.status, status));
    if (q) {
      const likeExpr = `%${q}%`;
      const ors = or(
        ilike(WorkTracker.unit, likeExpr),
        ilike(WorkTracker.task, likeExpr),
        ilike(WorkTracker.assignedTo, likeExpr),
        ilike(WorkTracker.status, likeExpr),
        ilike(WorkTracker.deadline, likeExpr),
        ilike(WorkTracker.workStart, likeExpr),
        ilike(WorkTracker.memberUpdate, likeExpr),
        ilike(WorkTracker.lastUpdated, likeExpr)
      );
      conds.push(ors);
    }
    const whereExpr = conds.length ? and(...(conds.filter(Boolean) as any)) : undefined;

    const sortCol =
      sort === "unit" ? WorkTracker.unit :
      sort === "task" ? WorkTracker.task :
      sort === "assignedTo" ? WorkTracker.assignedTo :
      sort === "status" ? WorkTracker.status :
      sort === "deadline" ? WorkTracker.deadline :
      sort === "workStart" ? WorkTracker.workStart :
      sort === "memberUpdate" ? WorkTracker.memberUpdate :
      WorkTracker.lastUpdated;

    const [{ count: total }] = await db
      .select({ count: count() })
      .from(WorkTracker)
      .where(whereExpr as any);

    const items = await db
      .select()
      .from(WorkTracker)
      .where(whereExpr as any)
      .orderBy(dir === "asc" ? asc(sortCol) : desc(sortCol))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return NextResponse.json({ items, total: Number(total), page, pageSize });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("GET error:", error);
    return NextResponse.json({ error: "Failed to fetch items" }, { status: 500 });
  }
}

// POST route
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const ItemCreate = z.object({
      unit: z.string().min(1, "unit required").max(64),
      task: z.string().min(3, "task required").max(280),
      assignedTo: z.string().min(1, "assignee required").max(120),
      status: z.enum(["To Do", "In Progress", "Done", "Blocked", "On Hold", "Canceled"]).default("To Do"),
      deadline: z.string().optional().nullable().transform((v) => v || ""),
      workStart: z.string().optional().nullable().transform((v) => v || ""),
      memberUpdate: z.string().optional().nullable().transform((v) => v || ""),
    });
    const parsed = ItemCreate.parse(body);
    const newItem = { ...parsed, lastUpdated: getFormattedDate() };
    
    const db = getDb();
    const result = await db.insert(WorkTracker).values(newItem as unknown as typeof WorkTracker.$inferInsert).returning();
    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("POST error:", error);
    return NextResponse.json({ error: "Failed to create item" }, { status: 500 });
  }
}
