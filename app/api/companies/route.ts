import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/utils/dbConfig";
import { Companies } from "@/utils/schema";
import { z } from "zod";
import { requireSession } from "@/lib/apiAuth";

export async function GET() {
  try {
    await requireSession();
    const db = getDb();
    const companies = await db
      .select()
      .from(Companies)
      .orderBy(Companies.companyName);

    return NextResponse.json(companies);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error fetching Company Details:", error);
    return NextResponse.json({ error: "Failed to fetch Company Details" }, { status: 500 });
  }
}

const CompanyCreateSchema = z.object({
  companyName: z.string(),
  companyWebsite: z.string().optional().nullable(),
  companyLinkedin: z.string().optional().nullable(),
  region: z.string(),
  industryFocus: z.string(),
  offerings: z.string(),
  marketingPosition: z.string(),
  potentialPainPoints: z.string(),
  contactName: z.string(),
  contactPosition: z.string(),
  linkedin: z.string().optional().nullable(),
  contactEmail: z.string().email(),
  isMailed: z.boolean().optional(),
  addedToMailList: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  try {
    await requireSession();
    const body = await req.json();
    const parsed = CompanyCreateSchema.parse(body);
    const toInsert: typeof Companies.$inferInsert = {
      companyName: parsed.companyName,
      region: parsed.region,
      industryFocus: parsed.industryFocus,
      offerings: parsed.offerings,
      marketingPosition: parsed.marketingPosition,
      potentialPainPoints: parsed.potentialPainPoints,
      contactName: parsed.contactName,
      contactPosition: parsed.contactPosition,
      contactEmail: parsed.contactEmail,
      ...(parsed.companyWebsite ? { companyWebsite: parsed.companyWebsite } : {}),
      ...(parsed.companyLinkedin ? { companyLinkedin: parsed.companyLinkedin } : {}),
      ...(parsed.linkedin ? { linkedin: parsed.linkedin } : {}),
      ...(parsed.isMailed !== undefined ? { isMailed: parsed.isMailed } : {}),
      ...(parsed.addedToMailList !== undefined ? { addedToMailList: parsed.addedToMailList } : {}),
    };
    
    const db = getDb();
    const inserted = await db.insert(Companies).values(toInsert).returning();
    return NextResponse.json(inserted[0], { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error creating company:", error);
    return NextResponse.json({ error: "Failed to create company" }, { status: 400 });
  }
}
