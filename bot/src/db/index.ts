import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { env } from "../env";
import * as schema from "./schema";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

fs.mkdirSync(path.dirname(env.DATABASE_URL), { recursive: true });
const sqlite = new Database(env.DATABASE_URL);
sqlite.pragma("journal_mode = WAL");

export const db = drizzle(sqlite, { schema });

export const runMigrations = () => {
  migrate(db, {
    migrationsFolder: path.join(__dirname, "../../drizzle"),
  });
};
