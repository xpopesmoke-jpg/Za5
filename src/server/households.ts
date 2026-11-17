import { and, eq, isNull } from "drizzle-orm";
import type { Db } from "@/db/client";
import { households, members } from "@/db/schema";
import { ValidationError } from "./errors";

export const HOME_NAME_MAX = 60;

export type MyHousehold = { id: string; name: string; role: "owner" | "member" };

/** Names a new home: creates the Household with this person as its Owner. */
export async function createHousehold(db: Db, userId: string, typedName: string): Promise<MyHousehold> {
  const name = typedName.trim();
  if (!name) throw new ValidationError("Give your home a name.");
  if (name.length > HOME_NAME_MAX) throw new ValidationError(`Keep the name under ${HOME_NAME_MAX} characters.`);
  if (await getMyHousehold(db, userId)) throw new ValidationError("You already belong to a home.");
  return db.transaction(async (tx) => {
    const [household] = await tx.insert(households).values({ name }).returning();
    await tx.insert(members).values({ householdId: household.id, userId, role: "owner" });
    return { id: household.id, name: household.name, role: "owner" as const };
  });
}

/** The Household this person currently belongs to, or null if they have none yet. */
export async function getMyHousehold(db: Db, userId: string): Promise<MyHousehold | null> {
  const [row] = await db
    .select({ id: households.id, name: households.name, role: members.role })
    .from(members)
    .innerJoin(households, eq(households.id, members.householdId))
    .where(and(eq(members.userId, userId), isNull(members.leftAt)));
  return row ?? null;
}
