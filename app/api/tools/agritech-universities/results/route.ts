import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { getDb } from "@/utils/dbConfig";
import { AgritechUniversitiesResults } from "@/utils/schema";
import { desc, eq } from "drizzle-orm";

const resultsSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(50),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const { page: validatedPage, limit: validatedLimit } = resultsSchema.parse({
      page,
      limit,
    });

    const offset = (validatedPage - 1) * validatedLimit;

    // Fetch results for the current user
    const results = await getDb()
      .select()
      .from(AgritechUniversitiesResults)
      .where(eq(AgritechUniversitiesResults.userId, session.user.email))
      .orderBy(desc(AgritechUniversitiesResults.createdAt))
      .limit(validatedLimit)
      .offset(offset);

    // Get total count for pagination
    const totalCountResult = await getDb()
      .select({ count: AgritechUniversitiesResults.id })
      .from(AgritechUniversitiesResults)
      .where(eq(AgritechUniversitiesResults.userId, session.user.email));

    const totalCount = totalCountResult.length;
    const totalPages = Math.ceil(totalCount / validatedLimit);

    return NextResponse.json({
      results,
      pagination: {
        page: validatedPage,
        limit: validatedLimit,
        totalCount,
        totalPages,
        hasNext: validatedPage < totalPages,
        hasPrev: validatedPage > 1,
      },
    });

  } catch (error) {
    console.error("Error fetching agritech results:", error);
    return NextResponse.json(
      { error: "Failed to fetch results" },
      { status: 500 }
    );
  }
}
