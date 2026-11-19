import { and, asc, eq, gte, isNull, lte, sql } from "drizzle-orm";
import type { Db } from "@/db/client";
import { members, occurrences, user } from "@/db/schema";
import { householdOf } from "./scope";

/** How many days back the Fairness balance looks. */
export const FAIRNESS_DAYS = 30;

export type FairnessRow = { userId: string; name: string; minutes: number; isMe: boolean };

/**
 * The Fairness balance: each current Member's Effort minutes for the Occurrences they completed in the last 30
 * days, at the Effort each had when done. Skips and Za5 add nothing. Current Members first by when they joined.
 */
export async function getFairness(db: Db, userId: string, now: Date): Promise<FairnessRow[]> {
  const home = await householdOf(db, userId);
  const since = new Date(now.getTime() - FAIRNESS_DAYS * 86_400_000);
  const people = await db
    .select({ userId: members.userId, name: user.name })
    .from(members)
    .innerJoin(user, eq(user.id, members.userId))
    .where(and(eq(members.householdId, home.id), isNull(members.leftAt)))
    .orderBy(asc(members.joinedAt));
  const sums = await db
    .select({ userId: occurrences.completedBy, minutes: sql<number>`coalesce(sum(${occurrences.effort}), 0)::int` })
    .from(occurrences)
    .where(and(eq(occurrences.householdId, home.id), gte(occurrences.completedAt, since), lte(occurrences.completedAt, now)))
    .groupBy(occurrences.completedBy);
  const byUser = new Map(sums.map((s) => [s.userId, Number(s.minutes)]));
  return people.map((p) => ({ userId: p.userId, name: p.name, minutes: byUser.get(p.userId) ?? 0, isMe: p.userId === userId }));
}
