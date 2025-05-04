import { db } from "@/utils/dbConfig";
import { LinkedinContent } from "@/utils/schema";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const contents = await db
      .select()
      .from(LinkedinContent)
      .orderBy(LinkedinContent.date);

    return NextResponse.json(contents);
  } catch (error) {
    console.error("Error fetching Content Details:", error);
    return NextResponse.json(
      { error: "Failed to fetch Content Details" },
      { status: 500 }
    );
  }
}
