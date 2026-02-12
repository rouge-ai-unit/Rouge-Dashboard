import { NextResponse } from "next/server";
import { getDb } from "@/utils/dbConfig";
import { ToolUsageLogs } from "@/utils/schema";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const { toolName, action = "view" } = await req.json();

        if (!toolName) {
            return new NextResponse("Tool name is required", { status: 400 });
        }

        const db = getDb();
        await db.insert(ToolUsageLogs).values({
            toolName,
            userId: (session.user as any).email || (session.user as any).id, // Adapting to likely user ID field
            action,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[ANALYTICS_TRACK]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
