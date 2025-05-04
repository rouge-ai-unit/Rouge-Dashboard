import { db } from "@/utils/dbConfig";
import { WorkTracker } from "@/utils/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

// PUT: Update a specific work tracker item
export async function PUT(req: NextRequest) {
  try {

    const url = new URL(req.url);
    const id = url.pathname.split("/").pop(); // Extracts the [id] from the URL

    const updatedItem = await req.json();
    updatedItem.lastUpdated = new Date().toISOString().split("T")[0];

    delete updatedItem._id; // Avoid updating _id

    const result = await db.update(WorkTracker).set(updatedItem).where(eq(WorkTracker._id, id!));

    return NextResponse.json(result);
  } catch (error) {
    console.error("PUT error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// DELETE: Remove a specific work tracker item
export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = url.pathname.split("/").pop();

    const result = await db.delete(WorkTracker).where(eq(WorkTracker._id, id!));

    return NextResponse.json(result);
  } catch (error) {
    console.error("DELETE error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
