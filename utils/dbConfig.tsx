import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { Pool } from "pg";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

let _db: any = null;

export function getDb() {
	if (_db) return _db;
	const url = process.env.DATABASE_URL || process.env.NEXT_PUBLIC_DATABASE_URL;
	if (!url) {
		throw new Error("DATABASE_URL is not set");
	}

	// SMART SWITCH: Use local postgres if flag is set
	const useLocal = process.env.USE_LOCAL_DB === "true";

	if (useLocal) {
		console.log("🔌 Using local database driver (pg)");
		const pool = new Pool({ connectionString: url });
		_db = drizzlePg(pool, { schema });
	} else {
		console.log("☁️ Using cloud database driver (neon-http)");
		const sql = neon(url);
		_db = drizzleNeon(sql, { schema });
	}

	return _db;
}


