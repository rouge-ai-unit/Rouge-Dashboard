import { NextResponse } from "next/server";
import { db } from "@/utils/dbConfig";
import { Companies } from "@/utils/schema";

export async function GET() {
  try {
    const companies = await db
      .select()
      .from(Companies)
      .orderBy(Companies.companyName);

    return NextResponse.json(companies);
  } catch (error) {
    console.error("Error fetching Company Details:", error);
    return NextResponse.json(
      { error: "Failed to fetch Company Details" },
      { status: 500 }
    );
  }
}
