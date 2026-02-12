import { NextResponse } from "next/server";
import { getDb } from "@/utils/dbConfig";
import { ToolUsageLogs } from "@/utils/schema";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sql, eq, and, gte, desc } from "drizzle-orm";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ toolId: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // Await params before using properties
        const { toolId } = await params;

        // Use toolId directly as it matches how we track (href/id)
        const toolName = `/${toolId}`;
        // Wait, the toolId in URL might be "work-tracker", but tracked as "/tools/work-tracker"
        // Let's handle both or standardized content. 
        // In Front-end tracking we will send the href. e.g. /tools/work-tracker
        // So here we should probably decode or expect the full path or just the slug.
        // Let's assume tracking sends the href. 
        // If specific tool pages exist at /tools/[slug], tracking likely sends /tools/[slug].
        // So if params.toolId is 'work-tracker', we query for '%work-tracker%'.
        // Better: let's standardize. Frontend tracks `id` which is `href`.
        // Standard hrefs are `/tools/work-tracker`.

        // We will query by contains or exact match if we can reconstruct.
        // Let's try exact match with reconstructed path first.
        const searchPath = `/tools/${toolId}`;

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const db = getDb();

        // 1. Active Users (Unique users in last 30 days)
        // Drizzle syntax for count distinct might need raw sql
        // 1. Active Users (Unique users in last 30 days)
        const activeUsersResult: any = await db.execute(sql`
            SELECT COUNT(DISTINCT ${ToolUsageLogs.userId}) as count
            FROM ${ToolUsageLogs}
            WHERE ${ToolUsageLogs.toolName} = ${searchPath}
            AND ${ToolUsageLogs.timestamp} >= ${thirtyDaysAgo}
        `);

        // Handle both PG (local) and Neon (cloud) result formats
        const activeUsersRows = Array.isArray(activeUsersResult) ? activeUsersResult : activeUsersResult.rows;
        const activeUsers = Number(activeUsersRows?.[0]?.count || 0);

        // 2. Usage Trends (Daily count for last 30 days)
        const usageTrendsResult: any = await db.execute(sql`
            SELECT DATE(${ToolUsageLogs.timestamp}) as date, COUNT(*) as count
            FROM ${ToolUsageLogs}
            WHERE ${ToolUsageLogs.toolName} = ${searchPath}
            AND ${ToolUsageLogs.timestamp} >= ${thirtyDaysAgo}
            GROUP BY DATE(${ToolUsageLogs.timestamp})
            ORDER BY date ASC
        `);

        const usageTrendsRows = Array.isArray(usageTrendsResult) ? usageTrendsResult : usageTrendsResult.rows;

        // Format for Recharts
        const usageTrends = (usageTrendsRows || []).map((r: any) => ({
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
