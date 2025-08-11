import { getDb } from "@/utils/dbConfig";
import { WorkTracker } from "@/utils/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/apiAuth";
import { z } from "zod";

const DEV_NO_DB = !process.env.DATABASE_URL && !process.env.NEXT_PUBLIC_DATABASE_URL;
// Use the shared in-memory store from the list route if available
// Note: simple fallback for local dev only
type Item = {
  _id: string;
  unit: string;
  task: string;
  assignedTo: string;
  status: string;
  lastUpdated: string;
  deadline: string;
  workStart: string;
  memberUpdate: string;
};
const globalAny = globalThis as unknown as { __worktracker_mem?: Item[] };
globalAny.__worktracker_mem = globalAny.__worktracker_mem || [];
const mem: Item[] = globalAny.__worktracker_mem;

// PUT: Update a specific work tracker item
export async function PUT(req: NextRequest) {
  try {
  await requireSession();

    const url = new URL(req.url);
    const id = url.pathname.split("/").pop(); // Extracts the [id] from the URL

    const body = await req.json();
    const ItemUpdate = z.object({
      unit: z.string().min(1).max(64),
      task: z.string().min(3).max(280),
      assignedTo: z.string().min(1).max(120),
      status: z.enum(["To Do", "In Progress", "Done", "Blocked", "On Hold", "Canceled"]),
      deadline: z.string().optional().nullable().transform((v) => v || ""),
      workStart: z.string().optional().nullable().transform((v) => v || ""),
      memberUpdate: z.string().optional().nullable().transform((v) => v || ""),
    });
  const updatedItem = { ...ItemUpdate.parse(body), lastUpdated: new Date().toISOString().split("T")[0] };
    if (DEV_NO_DB) {
      const idx = mem.findIndex((x) => x._id === id);
      if (idx >= 0) {
        mem[idx] = { ...mem[idx], ...updatedItem };
        return NextResponse.json(mem[idx]);
      }
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const db = getDb();
  const result = await db
      .update(WorkTracker)
      .set(updatedItem)
      .where(eq(WorkTracker._id, id!))
      .returning();
    return NextResponse.json(result[0] ?? null);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("PUT error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// PATCH: Partial updates, e.g., status only
export async function PATCH(req: NextRequest) {
  try {
    await requireSession();
    const url = new URL(req.url);
    const id = url.pathname.split("/").pop();
    const body = await req.json();
    const PartialUpdate = z
      .object({
        unit: z.string().min(1).max(64).optional(),
        task: z.string().min(3).max(280).optional(),
        assignedTo: z.string().min(1).max(120).optional(),
        status: z.enum(["To Do", "In Progress", "Done", "Blocked", "On Hold", "Canceled"]).optional(),
        deadline: z.string().optional().nullable(),
        workStart: z.string().optional().nullable(),
        memberUpdate: z.string().optional().nullable(),
      })
      .refine((obj) => Object.keys(obj).length > 0, "No fields to update");
  const parsed = PartialUpdate.parse(body);
  const payload = { ...parsed, lastUpdated: new Date().toISOString().split("T")[0] } as Partial<Item> & { lastUpdated: string };
    if (DEV_NO_DB) {
      const idx = mem.findIndex((x) => x._id === id);
      if (idx >= 0) {
  mem[idx] = { ...mem[idx], ...payload } as Item;
        return NextResponse.json(mem[idx]);
      }
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const db = getDb();
    const result = await db.update(WorkTracker).set(payload).where(eq(WorkTracker._id, id!)).returning();
    return NextResponse.json(result[0] ?? null);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("PATCH error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// DELETE: Remove a specific work tracker item
export async function DELETE(req: NextRequest) {
  try {
  await requireSession();
    const url = new URL(req.url);
    const id = url.pathname.split("/").pop();
    if (DEV_NO_DB) {
      const before = mem.length;
      const after = mem.filter((x) => x._id !== id);
      mem.length = 0;
      mem.push(...after);
      return NextResponse.json({ deleted: before - after.length });
    }
    const db = getDb();
    const result = await db.delete(WorkTracker).where(eq(WorkTracker._id, id!));
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("DELETE error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
