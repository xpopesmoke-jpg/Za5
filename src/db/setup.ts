import path from "node:path";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { migrate as migratePg } from "drizzle-orm/node-postgres/migrator";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import { PGlite } from "@electric-sql/pglite";
import { localPgliteDir, type Db } from "./client";
import * as schema from "./schema";

const migrationsFolder = path.join(process.cwd(), "drizzle");

/** Brings the database up to date using DATABASE_URL, or the local PGlite database. */
export async function migrateDb() {
  const url = process.env.DATABASE_URL;
  if (url && url.startsWith("postgres")) {
    const db = drizzlePg(url, { schema });
    await migratePg(db, { migrationsFolder });
    await db.$client.end();
  } else {
    const client = new PGlite(url || localPgliteDir());
    const db = drizzlePglite({ client, schema });
    await migratePglite(db, { migrationsFolder });
    await client.close();
  }
}

/** A fresh, empty in-memory database for tests. */
export async function createTestDb(): Promise<Db> {
  const client = new PGlite();
  const db = drizzlePglite({ client, schema });
  await migratePglite(db, { migrationsFolder });
  return db as unknown as Db;
}
