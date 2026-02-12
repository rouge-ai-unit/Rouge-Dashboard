import * as dotenv from "dotenv";
import { resolve } from "path";
import { getDb } from "../utils/dbConfig";
import { Units } from "../utils/auth-schema";
import { eq } from "drizzle-orm";

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), ".env.local") });

const units = [
    { name: "AI Unit", code: "AI", color: "#3B82F6", icon: "cpu", description: "Artificial Intelligence and Machine Learning research" },
    { name: "VC Management", code: "VC", color: "#10B981", icon: "briefcase", description: "Venture Capital and Investment management" },
    { name: "Social Media", code: "SM", color: "#EC4899", icon: "share-2", description: "Content creation and social platforms" },
    { name: "Sales & Marketing", code: "SALE", color: "#F59E0B", icon: "trending-up", description: "Outreach and business growth" },
    { name: "DevOps & Infrastructure", code: "OPS", color: "#6366F1", icon: "server", description: "System reliability and cloud management" },
];

async function seedUnits() {
    try {
        console.log("⏳ Initializing database connection...");
        const db = getDb();

        console.log("⏳ Seeding units...");

        for (const unit of units) {
            const [existing] = await db
                .select()
                .from(Units)
                .where(eq(Units.name, unit.name))
                .limit(1);

            if (existing) {
                console.log(`ℹ️ Unit "${unit.name}" already exists. Skipping.`);
                continue;
            }

            await db.insert(Units).values({
                ...unit,
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            });
            console.log(`✅ Seeded unit: ${unit.name}`);
        }

        console.log("✨ Seeding completed successfully!");
    } catch (error) {
        console.error("❌ Error during units seeding:", error);
    }
}

seedUnits();
