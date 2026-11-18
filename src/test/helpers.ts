import type { Db } from "@/db/client";
import { members, user } from "@/db/schema";

/** Creates an account directly in the database (skips the login system) for tests. */
export async function makeUser(db: Db, name: string) {
  const id = crypto.randomUUID();
  await db.insert(user).values({ id, name, email: `${name.toLowerCase()}@example.com` });
  return id;
}

/** Adds an existing account to a Household as a plain Member, without an invite. */
export async function addMember(db: Db, householdId: string, userId: string) {
  await db.insert(members).values({ householdId, userId, role: "member" });
}
