import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

let _db: ReturnType<typeof drizzle> | null = null;

export function getDb() {
	if (_db) return _db;
	const url = process.env.DATABASE_URL || process.env.NEXT_PUBLIC_DATABASE_URL;
	if (!url) {
		throw new Error("DATABASE_URL is not set");
	}
	const sql = neon(url);
	_db = drizzle(sql, { schema });
	return _db;
}
