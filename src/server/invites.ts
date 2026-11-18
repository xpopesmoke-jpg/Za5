import { randomBytes } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import type { Db } from "@/db/client";
import { households, invites, members, user } from "@/db/schema";
import { isUniqueViolation, NotAllowedError, NotFoundError, ValidationError } from "./errors";
import { getMyHousehold } from "./households";

/** How long an invite link works. */
export const INVITE_DAYS = 7;

const NOT_VALID = "This invite link has been used or has run out. Ask for a new one.";

/** The Owner makes a one-time link for someone to join the Household. */
export async function createInvite(db: Db, userId: string, now: Date): Promise<{ token: string; expiresAt: Date }> {
  const household = await getMyHousehold(db, userId);
  if (!household) throw new NotFoundError("Home");
  if (household.role !== "owner") throw new NotAllowedError("Only the owner can invite people.");
  const token = randomBytes(24).toString("base64url");
  const expiresAt = new Date(now.getTime() + INVITE_DAYS * 86_400_000);
  await db.insert(invites).values({ householdId: household.id, token, createdBy: userId, expiresAt });
  return { token, expiresAt };
}

const usable = (token: string, now: Date) => and(eq(invites.token, token), isNull(invites.usedAt), gt(invites.expiresAt, now));

/** What the join page shows before anyone signs in; null when the link cannot be used. */
export async function getInvite(db: Db, token: string, now: Date): Promise<{ householdName: string; invitedBy: string | null } | null> {
  const [row] = await db
    .select({ householdName: households.name, invitedBy: user.name })
    .from(invites)
    .innerJoin(households, eq(households.id, invites.householdId))
    .leftJoin(user, eq(user.id, invites.createdBy))
    .where(usable(token, now));
  return row ?? null;
}

/** The signed-in person joins the invite's Household as a Member, if they belong to none yet. */
export async function acceptInvite(db: Db, userId: string, token: string, now: Date): Promise<void> {
  if (await getMyHousehold(db, userId)) throw new ValidationError("You already belong to a home.");
  try {
    await db.transaction(async (tx) => {
      // Held until the end, so two people opening the same link at once cannot both get in.
      const [invite] = await tx.select().from(invites).where(usable(token, now)).for("update");
      if (!invite) throw new ValidationError(NOT_VALID);
      await tx.insert(members).values({ householdId: invite.householdId, userId, role: "member", joinedAt: now });
      await tx.update(invites).set({ usedAt: now, usedBy: userId }).where(eq(invites.id, invite.id));
    });
  } catch (err) {
    // One current Household per person, also when two joins race.
    if (isUniqueViolation(err)) throw new ValidationError("You already belong to a home.");
    throw err;
  }
}
