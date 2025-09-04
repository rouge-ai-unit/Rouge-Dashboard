import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { getDb } from "@/utils/dbConfig";
import { AgritechStartups } from "@/utils/schema";
import { eq, and } from "drizzle-orm";

// Validation schema
const deleteSchema = z.object({
  startupId: z.string().uuid()
});

/**
 * DELETE /api/tools/startup-seeker/delete
 * Delete a startup from the user's portfolio
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Authentication required", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validation = deleteSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid request data",
          details: validation.error.issues,
          code: "VALIDATION_ERROR"
        },
        { status: 400 }
      );
    }

    const { startupId } = validation.data;
    const userId = session.user.email;

    console.log(`🗑️ Deleting startup ${startupId} for user ${userId}`);

    const db = getDb();

    // Check if startup exists and belongs to user
    const existingStartup = await db
      .select()
      .from(AgritechStartups)
      .where(
        and(
          eq(AgritechStartups.id, startupId),
          eq(AgritechStartups.userId, userId)
        )
      )
      .limit(1);

    if (existingStartup.length === 0) {
      return NextResponse.json(
        { error: "Startup not found or access denied", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    // Delete the startup
    await db
      .delete(AgritechStartups)
      .where(
        and(
          eq(AgritechStartups.id, startupId),
          eq(AgritechStartups.userId, userId)
        )
      );

    console.log(`✅ Successfully deleted startup ${startupId}`);

    return NextResponse.json({
      success: true,
      message: "Startup deleted successfully"
    });

  } catch (error) {
    console.error("Delete startup API error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        code: "INTERNAL_ERROR"
      },
      { status: 500 }
    );
  }
}