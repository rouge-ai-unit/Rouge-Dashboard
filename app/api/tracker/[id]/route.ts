import { getDb } from "@/utils/dbConfig";
import { WorkTracker } from "@/utils/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/apiAuth";
import { z } from "zod";

// PUT: Update a specific work tracker item
export async function PUT(req: NextRequest) {
  try {
    await requireSession();

    const url = new URL(req.url);
    const id = url.pathname.split("/").pop();

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
        status: z
          .enum(["To Do", "In Progress", "Done", "Blocked", "On Hold", "Canceled"])
          .optional(),
        deadline: z.string().optional().nullable(),
        workStart: z.string().optional().nullable(),
        memberUpdate: z.string().optional().nullable(),
      })
      .refine((obj) => Object.keys(obj).length > 0, "No fields to update");
    const parsed = PartialUpdate.parse(body);
    const payload = {
      ...parsed,
      lastUpdated: new Date().toISOString().split("T")[0],
    };

    const db = getDb();
    const result = await db
      .update(WorkTracker)
      .set(payload)
      .where(eq(WorkTracker._id, id!))
      .returning();
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
