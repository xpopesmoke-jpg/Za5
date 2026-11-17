import fs from "node:fs";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { PGlite } from "@electric-sql/pglite";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

/**
 * The app talks to Postgres.
 * - Production (Coolify): DATABASE_URL points at a real Postgres server.
 * - Local development without DATABASE_URL: an embedded Postgres (PGlite) in ./.data/pglite, so no server is needed.
 * - Tests: an in-memory PGlite (see createTestDb).
 */
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

export type DatabaseTarget = { kind: "postgres"; url: string } | { kind: "pglite"; dir: string };

/**
 * Which database to use. In production the embedded database would live on a disk that redeploys wipe, so production
 * refuses to start without Postgres (set ALLOW_LOCAL_DB=1 to try a production build on your own machine).
 */
export function databaseTarget(): DatabaseTarget {
  const url = process.env.DATABASE_URL;
  if (url && url.startsWith("postgres")) return { kind: "postgres", url };
  if (process.env.NODE_ENV === "production" && !process.env.ALLOW_LOCAL_DB) {
    throw new Error("DATABASE_URL must point at a Postgres database in production (postgres://…).");
  }
  return { kind: "pglite", dir: url || localPgliteDir() };
}

function createDb(): Db {
  const target = databaseTarget();
  if (target.kind === "postgres") return drizzlePg(target.url, { schema }) as unknown as Db;
  return drizzlePglite({ client: new PGlite(target.dir), schema }) as unknown as Db;
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
