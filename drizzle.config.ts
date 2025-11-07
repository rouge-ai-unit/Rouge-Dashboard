import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

// Load environment variables from .env.local
dotenv.config({ path: ".env.local" });

export default defineConfig({
  dialect: "postgresql",
  schema: ["./utils/schema.tsx", "./utils/auth-schema.tsx"],
  dbCredentials: {
    url: process.env.DATABASE_URL as string,
  },
});
