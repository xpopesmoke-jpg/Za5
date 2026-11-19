import { and, eq, gte, lt, sql } from "drizzle-orm";
import type { Db } from "@/db/client";
import { households, occurrences } from "@/db/schema";
import { daysBetween, localDay } from "@/domain/schedule";
import { isOpen } from "./chores";
import { householdOf } from "./scope";

/** Whether the Household is Away, and since when. */
export async function getAway(db: Db, userId: string): Promise<{ since: Date } | null> {
  const home = await householdOf(db, userId);
  return home.awaySince ? { since: home.awaySince } : null;
}

/**
 * Any Member switches Away on (a holiday: nothing becomes overdue) or off. On return the schedule picks up from
 * the return day: what fell due while away is due on the return day, and what was already late before keeps
 * exactly the lateness it had, instead of the whole holiday on top.
 */
export async function setAway(db: Db, userId: string, away: boolean, now: Date): Promise<void> {
  const home = await householdOf(db, userId);
  await db.transaction(async (tx) => {
    const [row] = await tx.select({ awaySince: households.awaySince }).from(households).where(eq(households.id, home.id)).for("update");
    if (away) {
      if (!row.awaySince) await tx.update(households).set({ awaySince: now }).where(eq(households.id, home.id));
      return;
    }
    if (!row.awaySince) return;
    const leftOn = localDay(row.awaySince, home.timeZone);
    const backOn = localDay(now, home.timeZone);
    const awayDays = Math.max(0, daysBetween(leftOn, backOn));
    const open = and(eq(occurrences.householdId, home.id), isOpen());
    await tx.update(occurrences).set({ dueOn: backOn }).where(and(open, gte(occurrences.dueOn, leftOn), lt(occurrences.dueOn, backOn)));
    if (awayDays > 0) {
      await tx
        .update(occurrences)
        .set({ dueOn: sql`${occurrences.dueOn} + ${awayDays}::int` })
        .where(and(open, lt(occurrences.dueOn, leftOn)));
    }
    await tx.update(households).set({ awaySince: null }).where(eq(households.id, home.id));
  });
}
