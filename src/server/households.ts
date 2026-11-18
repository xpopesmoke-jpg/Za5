import { and, eq, isNull } from "drizzle-orm";
import type { Db } from "@/db/client";
import { floors, households, memberRole, members } from "@/db/schema";
import { HOME_NAME_MAX } from "@/domain/limits";
import { isUniqueViolation, ValidationError } from "./errors";

export const ALREADY_IN_A_HOME = "You already belong to a home.";

export type MyHousehold = { id: string; name: string; role: (typeof memberRole.enumValues)[number]; timeZone: string };

/** Names a new home: creates the Household with this person as its Owner. */
export async function createHousehold(db: Db, userId: string, typedName: string): Promise<MyHousehold> {
  const name = typedName.trim();
  if (!name) throw new ValidationError("Give your home a name.");
  if (name.length > HOME_NAME_MAX) throw new ValidationError(`Keep the name under ${HOME_NAME_MAX} characters.`);
  if (await getMyHousehold(db, userId)) throw new ValidationError(ALREADY_IN_A_HOME);
  try {
    return await db.transaction(async (tx) => {
      const [household] = await tx.insert(households).values({ name }).returning();
      await tx.insert(members).values({ householdId: household.id, userId, role: "owner" });
      // A home always has at least one Floor, so Rooms have somewhere to go from the start.
      await tx.insert(floors).values({ householdId: household.id, position: 0 });
      return { id: household.id, name: household.name, role: "owner" as const, timeZone: household.timeZone };
    });
  } catch (err) {
    // Two submits at once both pass the check above; the one-current-household index stops the second.
    if (isUniqueViolation(err)) throw new ValidationError(ALREADY_IN_A_HOME);
    throw err;
  }
}

/** The Household this person currently belongs to, or null if they have none yet. */
export async function getMyHousehold(db: Db, userId: string): Promise<MyHousehold | null> {
  const [row] = await db
    .select({ id: households.id, name: households.name, role: members.role, timeZone: households.timeZone })
    .from(members)
    .innerJoin(households, eq(households.id, members.householdId))
    .where(and(eq(members.userId, userId), isNull(members.leftAt)));
  return row ?? null;
}

