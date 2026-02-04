/**
 * API Route: Create User
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/utils/dbConfig";
import { Users } from "@/utils/auth-schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { sendWelcomeEmail } from "@/lib/auth/email-service";

export async function POST(request: NextRequest) {
    try {
        // Check authentication
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        // Check if user is admin
        const userRole = (session.user as any)?.role;

        if (userRole !== "admin") {
            return NextResponse.json(
                { error: "Forbidden - Admin access required" },
                { status: 403 }
            );
        }

        // Parse request body
        const body = await request.json();
        const { email, firstName, lastName, role, unit } = body;

        // Validate required fields
        if (!email || !firstName || !lastName || !role || !unit) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        const db = getDb();

        // Check if user already exists
        const [existingUser] = await db
            .select()
            .from(Users)
            .where(eq(Users.email, email))
            .limit(1);

        if (existingUser) {
            return NextResponse.json(
                { error: "User with this email already exists" },
                { status: 409 }
            );
        }

        // Generate temporary password
        const tempPassword = Math.random().toString(36).slice(-8);
        const hashedPassword = await bcrypt.hash(tempPassword, 10);

        // Create new user
        const [newUser] = await db
            .insert(Users)
            .values({
                email,
                firstName,
                lastName,
                displayName: `${firstName} ${lastName}`,
                password: hashedPassword,
                role: role || "member",
                unit,
                status: "pending",
                isApproved: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            })
            .returning();

        const [verifiedUser] = await db
            .select()
            .from(Users)
            .where(eq(Users.email, email))
            .limit(1);

        console.log('Verified user in DB:', verifiedUser);

        // Send welcome email (non-blocking)
        sendWelcomeEmail(newUser.email, newUser.displayName).catch((err) => {
            console.error("[User Create API] Failed to send welcome email:", err);
        });

        return NextResponse.json(
            {
                success: true,
                message: "User created successfully",
                user: {
                    id: newUser.id,
                    email: newUser.email,
                    displayName: newUser.displayName,
                    role: newUser.role,
                    unit: newUser.unit,
                },
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("[Admin API] Error creating user:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}