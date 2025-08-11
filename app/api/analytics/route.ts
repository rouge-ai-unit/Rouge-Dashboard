import { NextResponse } from "next/server";
import { getRealtimeUsers } from "@/lib/ga";

export async function GET() {
  try {
  const propertyId = process.env.GA4_PROPERTY_ID;
  if (!propertyId) return NextResponse.json({ users: 0, error: "GA not configured" }, { status: 200 });
    const data = await getRealtimeUsers(propertyId);
    return NextResponse.json(data);
  } catch (e) {
    console.error("/api/analytics error", e);
    return NextResponse.json({ users: 0, error: "analytics unavailable" }, { status: 200 });
  }
}
