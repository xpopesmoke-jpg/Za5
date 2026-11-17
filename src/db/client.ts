import fs from "node:fs";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { PGlite } from "@electric-sql/pglite";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

/**
 * The app talks to Postgres.
 * - Production (Coolify): DATABASE_URL points at a real Postgres server.
 * - Local development without DATABASE_URL: an embedded Postgres (PGlite)
 *   stored in ./.data/pglite, so no database server is needed.
 * - Tests: an in-memory PGlite (see createTestDb).
 */
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

function createDb(): Db {
  const url = process.env.DATABASE_URL;
  if (url && url.startsWith("postgres")) {
    return drizzlePg(url, { schema }) as unknown as Db;
  }
  const client = new PGlite(url || localPgliteDir());
  return drizzlePglite({ client, schema }) as unknown as Db;
}

const globalForDb = globalThis as unknown as { __za5Db?: Db };

/** One shared connection per server process (survives dev hot reloads). Created on first use. */
export function getDb(): Db {
  globalForDb.__za5Db ??= createDb();
  return globalForDb.__za5Db;
}

/** Folder for the local development database (created if missing). */
export function localPgliteDir() {
  const dir = "./.data/pglite";
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}
