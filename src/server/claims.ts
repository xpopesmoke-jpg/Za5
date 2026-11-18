import { and, eq, isNull, ne, sql } from "drizzle-orm";
import type { Db } from "@/db/client";
import { chores, households, occurrences, user } from "@/db/schema";
import { localDay, type Day } from "@/domain/schedule";
import { householdOf, idOf } from "./chores";
import { NotAllowedError, NotFoundError, ValidationError } from "./errors";

export type DoneForYou = { occurrenceId: string; choreName: string; doneByName: string; doneAt: Date };

const holds = (claimedUntil: Day | null, today: Day) => claimedUntil !== null && claimedUntil >= today;

/** Locks one of this Household's open Occurrences for a change to its Claim. */
async function lockedOpen(tx: Pick<Db, "select">, householdId: string, occurrenceId: string) {
  const [row] = await tx
    .select()
    .from(occurrences)
    .where(and(eq(occurrences.id, idOf(occurrenceId, "Chore")), eq(occurrences.householdId, householdId)))
    .for("update");
  if (!row) throw new NotFoundError("Chore");
  if (row.completedAt) throw new ValidationError("That one is already done.");
  return row;
}

/**
 * A Member takes an Occurrence from the pool. The Claim holds until the end of its due day, or of today when it
 * is already overdue; anyone may still complete it meanwhile.
 */
export async function claimOccurrence(db: Db, userId: string, occurrenceId: string, now: Date): Promise<void> {
  const home = await householdOf(db, userId);
  const today = localDay(now, home.timeZone);
  await db.transaction(async (tx) => {
    const o = await lockedOpen(tx, home.id, occurrenceId);
    if (o.claimedBy && o.claimedBy !== userId && holds(o.claimedUntil, today)) throw new ValidationError("Someone else has already claimed this.");
    await tx.update(occurrences).set({ claimedBy: userId, claimedUntil: o.dueOn > today ? o.dueOn : today }).where(eq(occurrences.id, o.id));
  });
}

/** The claimer lets it go back to the pool. */
export async function unclaimOccurrence(db: Db, userId: string, occurrenceId: string, now: Date): Promise<void> {
  const home = await householdOf(db, userId);
  const today = localDay(now, home.timeZone);
  await db.transaction(async (tx) => {
    const o = await lockedOpen(tx, home.id, occurrenceId);
    if (!o.claimedBy || !holds(o.claimedUntil, today)) return;
    if (o.claimedBy !== userId) throw new NotAllowedError("Only the person who claimed it can let it go.");
    await tx.update(occurrences).set({ claimedBy: null, claimedUntil: null }).where(eq(occurrences.id, o.id));
  });
}

/**
 * "Pope did this for you": Occurrences this Member had claimed that someone else completed while the Claim
 * still held, and that they have not put away yet. Newest first.
 */
export async function getDoneForYou(db: Db, userId: string): Promise<DoneForYou[]> {
  const home = await householdOf(db, userId);
  const rows = await db
    .select({ occurrenceId: occurrences.id, choreName: chores.name, doneByName: user.name, doneAt: occurrences.completedAt })
    .from(occurrences)
    .innerJoin(chores, eq(chores.id, occurrences.choreId))
    .innerJoin(households, eq(households.id, occurrences.householdId))
    .innerJoin(user, eq(user.id, occurrences.completedBy))
    .where(
      and(
        eq(occurrences.householdId, home.id),
        eq(occurrences.claimedBy, userId),
        ne(occurrences.completedBy, userId),
        isNull(occurrences.claimNoteSeenAt),
        // Done on a day the Claim still held, in the home's own time.
        sql`(${occurrences.completedAt} at time zone ${households.timeZone})::date <= ${occurrences.claimedUntil}`,
      ),
    )
    .orderBy(sql`${occurrences.completedAt} desc`);
  return rows.map((r) => ({ ...r, doneAt: r.doneAt! }));
}

/** The claimer has seen the note and puts it away. */
export async function dismissDoneForYou(db: Db, userId: string, occurrenceId: string, now: Date): Promise<void> {
  const home = await householdOf(db, userId);
  await db
    .update(occurrences)
    .set({ claimNoteSeenAt: now })
    .where(and(eq(occurrences.id, idOf(occurrenceId, "Chore")), eq(occurrences.householdId, home.id), eq(occurrences.claimedBy, userId)));
}
