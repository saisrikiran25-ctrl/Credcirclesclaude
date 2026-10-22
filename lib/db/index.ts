import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import fs from "node:fs";
import path from "node:path";
import * as schema from "./schema";

export type Db = BetterSQLite3Database<typeof schema>;

const BUNDLED_DB = path.join(process.cwd(), "circlo.db");
/**
 * On Vercel the deployment folder is read-only: copy the database seeded at build time into /tmp
 * (the only writable place) on first use. That copy is per serverless instance and is lost when
 * the instance is recycled, so a Vercel deployment is a demo, not durable storage.
 */
function resolveDbPath(): string {
  if (process.env.CIRCLO_DB) return process.env.CIRCLO_DB;
  if (process.env.VERCEL) {
    const tmp = "/tmp/circlo.db";
    if (!fs.existsSync(tmp)) fs.copyFileSync(BUNDLED_DB, tmp);
    return tmp;
  }
  return BUNDLED_DB;
}
const MIGRATIONS = path.join(process.cwd(), "drizzle");

type Holder = { db?: Db; raw?: Database.Database };
const g = globalThis as unknown as { __circlo?: Holder };

/** Open (and migrate) the SQLite database. One connection, reused across hot reloads. */
export function openDb(file: string = resolveDbPath()): { db: Db; raw: Database.Database } {
  const raw = new Database(file);
  raw.pragma("journal_mode = WAL");
  raw.pragma("foreign_keys = ON");
  const db = drizzle(raw, { schema });
  migrate(db, { migrationsFolder: MIGRATIONS });
  return { db, raw };
}

export function getDb(): Db {
  const h = (g.__circlo ??= {});
  if (!h.db) {
    const { db, raw } = openDb();
    h.db = db;
    h.raw = raw;
  }
  return h.db;
}

export { schema };
