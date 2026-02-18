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
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { toolId } = await params;
        const searchPath = `/tools/${toolId}`;

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        let db;
        try {
            db = getDb();
        } catch (dbError: any) {
            console.error("[ANALYTICS_TOOL_GET] DB init error:", dbError);
            return NextResponse.json({
                error: "Database connection failed",
                details: dbError?.message || String(dbError),
            }, { status: 500 });
        }

        let activeUsers = 0;
        let usageTrends: { date: string; count: number }[] = [];

        try {
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

            activeUsers = Number(activeUsersResult[0]?.count || 0);

            // 2. Usage Trends (Daily count for last 30 days)
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

            usageTrends = usageTrendsResult.map((r) => ({
                date: new Date(r.date).toLocaleDateString(),
                count: Number(r.count),
            }));
        } catch (queryError: any) {
            // If the table doesn't exist, return empty data instead of crashing
            const msg = queryError?.message || String(queryError);
            console.error("[ANALYTICS_TOOL_GET] Query error:", msg);

            if (msg.includes("does not exist") || msg.includes("relation")) {
                // Table missing — return empty analytics
                return NextResponse.json({
                    activeUsers: 0,
                    usageTrends: [],
                    warning: "Analytics table not found. Run drizzle-kit push to create it.",
                });
            }

            return NextResponse.json({
                error: "Query failed",
                details: msg,
            }, { status: 500 });
        }

        return NextResponse.json({
            activeUsers,
            usageTrends,
        });
    } catch (error: any) {
        console.error("[ANALYTICS_TOOL_GET]", error);
        return NextResponse.json({
            error: "Internal Error",
            details: error?.message || String(error),
        }, { status: 500 });
    }
}
