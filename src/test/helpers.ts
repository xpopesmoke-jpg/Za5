import type { Db } from "@/db/client";
import { user } from "@/db/schema";

/** Creates an account directly in the database (skips the login system) for tests. */
export async function makeUser(db: Db, name: string) {
  const id = crypto.randomUUID();
  await db.insert(user).values({ id, name, email: `${name.toLowerCase()}@example.com` });
  return id;
}
