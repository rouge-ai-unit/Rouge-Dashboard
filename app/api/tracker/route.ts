import { db } from "@/utils/dbConfig";
import { WorkTracker } from "@/utils/schema";
import { NextRequest, NextResponse } from "next/server";

const getFormattedDate = () => new Date().toISOString().split("T")[0];

export async function GET() {
  try {
    // const collection = db.collection("worktracker");
    const collection = await db.select().from(WorkTracker).orderBy(WorkTracker.lastUpdated);

    return NextResponse.json(collection);
  } catch (error) {
    console.error("GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch items" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const newItem = await req.json();
    newItem.lastUpdated = getFormattedDate();

    const result = await db.insert(WorkTracker).values(newItem);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("POST error:", error);
    return NextResponse.json(
      { error: "Failed to create item" },
      { status: 500 }
    );
  }
}
