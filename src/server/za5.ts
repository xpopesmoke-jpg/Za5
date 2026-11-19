import { and, count, eq, gte } from "drizzle-orm";
import type { Db } from "@/db/client";
import { occurrences, za5Presses } from "@/db/schema";
import { addDays, localDay, zonedTime } from "@/domain/schedule";
import { closedReason } from "./chores";
import { NotFoundError, ValidationError } from "./errors";
import { householdOf, idOf } from "./scope";

/** "Later today" puts it off this long. */
export const LATER_HOURS = 3;
/** "Tomorrow" brings it back at this hour, in the home's time. */
export const TOMORROW_HOUR = 7;

/**
 * Za5: the Member honestly puts an Occurrence off, until later today or tomorrow morning. It stays on Today's
 * list, marked, and is not overdue meanwhile; their monthly Za5 count goes up. Credit and the Fairness balance
 * are untouched: whoever later does it gets the minutes.
 */
export async function za5Occurrence(db: Db, userId: string, occurrenceId: string, when: "later" | "tomorrow", now: Date): Promise<{ until: Date }> {
  const home = await householdOf(db, userId);
  const today = localDay(now, home.timeZone);
  const until =
    when === "later" ? new Date(now.getTime() + LATER_HOURS * 3_600_000) : zonedTime(addDays(today, 1), TOMORROW_HOUR, 0, home.timeZone);
  if (when === "later" && localDay(until, home.timeZone) !== today) throw new ValidationError("It's too late for later today. Pick tomorrow.");
  await db.transaction(async (tx) => {
    const [o] = await tx
      .select()
      .from(occurrences)
      .where(and(eq(occurrences.id, idOf(occurrenceId, "Chore")), eq(occurrences.householdId, home.id)))
      .for("update");
    if (!o) throw new NotFoundError("Chore");
    const closed = closedReason(o);
    if (closed) throw new ValidationError(closed);
    await tx.update(occurrences).set({ postponedUntil: until }).where(eq(occurrences.id, o.id));
    await tx.insert(za5Presses).values({ householdId: home.id, userId, occurrenceId: o.id, pressedAt: now });
  });
  return { until };
}

/** How many times this Member said Za5 this calendar month (in the home's time). */
export async function getZa5Count(db: Db, userId: string, now: Date): Promise<number> {
  const home = await householdOf(db, userId);
  const monthStart = zonedTime(`${localDay(now, home.timeZone).slice(0, 7)}-01`, 0, 0, home.timeZone);
  const [row] = await db
    .select({ n: count() })
    .from(za5Presses)
    .where(and(eq(za5Presses.householdId, home.id), eq(za5Presses.userId, userId), gte(za5Presses.pressedAt, monthStart)));
  return row.n;
}
