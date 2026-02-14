import { NextResponse } from "next/server";
import { getDb } from "@/utils/dbConfig";
import { ToolUsageLogs } from "@/utils/schema";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sql, eq, and, gte } from "drizzle-orm";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ toolId: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const { toolId } = await params;
        const searchPath = `/tools/${toolId}`;

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const db = getDb();

        // 1. Active Users (Unique users in last 30 days)
        const activeUsersResult = await db
            .select({ count: sql<number>`count(distinct ${ToolUsageLogs.userId})` })
            .from(ToolUsageLogs)
            .where(
                and(
                    eq(ToolUsageLogs.toolName, searchPath),
                    gte(ToolUsageLogs.timestamp, thirtyDaysAgo)
                )
            );

        const activeUsers = Number(activeUsersResult[0]?.count || 0);

        // 2. Usage Trends (Daily count for last 30 days)
        // Group by date part of timestamp
        const usageTrendsResult = await db
            .select({
                date: sql<string>`DATE(${ToolUsageLogs.timestamp})`,
                count: sql<number>`count(*)`
            })
            .from(ToolUsageLogs)
            .where(
                and(
                    eq(ToolUsageLogs.toolName, searchPath),
                    gte(ToolUsageLogs.timestamp, thirtyDaysAgo)
                )
            )
            .groupBy(sql`DATE(${ToolUsageLogs.timestamp})`)
            .orderBy(sql`DATE(${ToolUsageLogs.timestamp}) ASC`);

        // Format for Recharts
        const usageTrends = usageTrendsResult.map((r) => ({
            date: new Date(r.date).toLocaleDateString(),
            count: Number(r.count),
        }));

        return NextResponse.json({
            activeUsers,
            usageTrends,
        });
    } catch (error) {
        console.error("[ANALYTICS_TOOL_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
