import { and, count, eq, gte } from "drizzle-orm";
import type { Db } from "@/db/client";
import { occurrences, za5Presses } from "@/db/schema";
import { addDays, localDay, zonedTime } from "@/domain/schedule";
import { lockOpenOccurrence } from "./chores";
import { householdOf } from "./scope";

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
  // "Later today" late in the evening can only mean tomorrow morning.
  const until = (when === "later" && laterToday(now, home.timeZone)) || tomorrowMorning(now, home.timeZone);
  await db.transaction(async (tx) => {
    const { occurrence } = await lockOpenOccurrence(tx, home.id, occurrenceId);
    await tx.update(occurrences).set({ postponedUntil: until }).where(eq(occurrences.id, occurrence.id));
    await tx.insert(za5Presses).values({ householdId: home.id, userId, occurrenceId: occurrence.id, pressedAt: now });
  });
  return { until };
}

/** When "Later today" would end, if that is still today in the home's time; else null. */
export function laterToday(now: Date, timeZone: string): Date | null {
  const until = new Date(now.getTime() + LATER_HOURS * 3_600_000);
  return localDay(until, timeZone) === localDay(now, timeZone) ? until : null;
}

const tomorrowMorning = (now: Date, timeZone: string) => zonedTime(addDays(localDay(now, timeZone), 1), TOMORROW_HOUR, 0, timeZone);

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
