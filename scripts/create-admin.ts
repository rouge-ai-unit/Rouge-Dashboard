import * as dotenv from "dotenv";
import { resolve } from "path";
import bcrypt from "bcryptjs";
import { getDb } from "../utils/dbConfig";
import { Users } from "../utils/auth-schema";
import { eq } from "drizzle-orm";

// Load environment variables from .env.local
dotenv.config({ path: resolve(process.cwd(), ".env.local") });

async function createAdmin() {
    const adminEmail = "admin.rouge@gmail.com";
    const adminPassword = "AdminPassword123!";
    const firstName = "Admin";
    const lastName = "User";

    try {
        console.log("⏳ Initializing database connection...");
        const db = getDb();

        // Check if admin already exists
        const [existingUser] = await db
            .select()
            .from(Users)
            .where(eq(Users.email, adminEmail))
            .limit(1);

        if (existingUser) {
            console.log(`ℹ️ User with email ${adminEmail} already exists.`);

            if (existingUser.role !== "admin" || !existingUser.isApproved) {
                console.log("⏳ Updating user to Admin status...");
                await db
                    .update(Users)
                    .set({
                        role: "admin",
                        isApproved: true,
                        status: "active",
                        updatedAt: new Date(),
                    })
                    .where(eq(Users.id, existingUser.id));
                console.log("✅ User updated to Admin successfully!");
            }
            return;
        }

        console.log("⏳ Hashing password...");
        const passwordHash = await bcrypt.hash(adminPassword, 12);

        console.log("⏳ Creating admin user account...");
        await db.insert(Users).values({
            email: adminEmail,
            passwordHash,
            firstName,
            lastName,
            displayName: `${firstName} ${lastName}`,
            role: "admin",
            status: "active",
            isActive: true,
            isApproved: true,
            unit: "AI Unit",
            emailVerified: true,
            oauthProvider: "credentials",
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        console.log("==========================================");
        console.log("✅ Admin account created successfully!");
        console.log(`📧 Email: ${adminEmail}`);
        console.log(`🔑 Password: ${adminPassword}`);
        console.log("==========================================");
        console.log("ℹ️ You can now sign in at http://localhost:3000/signin");
    } catch (error) {
        console.error("❌ Error during admin creation:", error);
        if (error instanceof Error && error.message.includes("ECONNREFUSED")) {
            console.error("\n💡 TIP: Connection refused. Check if your PostgreSQL service is running.");
            console.error("   Current DATABASE_URL:", process.env.DATABASE_URL);
        }
    }
}

createAdmin();
