const fs = require('fs');
const path = require('path');

const dbConfigPath = path.resolve(__dirname, '../utils/dbConfig.tsx');

const originalContent = `import { neon } from "@neondatabase/serverless";
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
`;

function cleanup() {
    console.log('⏳ Cleaning up local database configuration...');

    if (fs.existsSync(dbConfigPath)) {
        fs.writeFileSync(dbConfigPath, originalContent);
        console.log('✅ Reverted utils/dbConfig.tsx to production state.');
    } else {
        console.error('❌ Could not find utils/dbConfig.tsx');
    }

    // Optional: Remove USE_LOCAL_DB from .env.local
    const envPath = path.resolve(__dirname, '../.env.local');
    if (fs.existsSync(envPath)) {
        let envContent = fs.readFileSync(envPath, 'utf8');
        envContent = envContent.replace(/\nUSE_LOCAL_DB=true/g, '');
        fs.writeFileSync(envPath, envContent);
        console.log('✅ Removed USE_LOCAL_DB from .env.local');
    }

    console.log('\n✨ Cleanup complete! You can now safely push to production.');
}

cleanup();
