import { and, asc, desc, eq, gte, isNotNull, isNull, lte } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { Db } from "@/db/client";
import { chores, fixtures, occurrences, rooms, user } from "@/db/schema";
import { CHORE_NAME_MAX, CHORE_NOTE_MAX, EFFORT_MAX, EVERY_DAYS_MAX } from "@/domain/limits";
import { addDays, daysBetween, dueAfterDone, firstDue, localDay, scheduleFromColumns, scheduleToColumns, type Day, type Schedule } from "@/domain/schedule";
import type { FixtureType } from "./home-types";
import { NotFoundError, ValidationError } from "./errors";
import { householdOf, idOf } from "./scope";

export type NewChore = {
  name: string;
  note?: string | null;
  /** The Room it sits in; leave out (and the Fixture too) for the Whole home */
  roomId?: string | null;
  /** A Fixture in that Room; its Room is then the Chore's Room */
  fixtureId?: string | null;
  /** Effort in minutes */
  effort: number;
  schedule: Schedule;
  /** The starter-library entry it came from (set by the walkthrough) */
  libraryKey?: string | null;
  /** For an interval schedule: first due this many days from today instead of today (the walkthrough spreads them) */
  startsInDays?: number;
};

export type TodayItem = {
  occurrenceId: string;
  choreId: string;
  name: string;
  note: string | null;
  effort: number;
  roomId: string | null;
  roomName: string | null;
  /** Its Room was removed; it waits in "Needs a new room" (roomId is then null, but it is not the Whole home) */
  needsRoom: boolean;
  fixtureType: FixtureType | null;
  dueOn: Day;
  /** 0 when due today */
  overdueDays: number;
  /** Za5: put off until this moment, while that is still ahead (then shown after the rest, and not overdue) */
  postponedUntil: Date | null;
  /** Who has claimed it, while the Claim holds */
  claim: { by: string; name: string; mine: boolean } | null;
};

/** An Occurrence is open while it is neither done nor Skipped. */
export const isOpen = () => and(isNull(occurrences.completedAt), isNull(occurrences.skippedAt));

/** Why a closed Occurrence can't be acted on any more. */
export function closedReason(o: { completedAt: Date | null; skippedAt: Date | null }): string | null {
  if (o.completedAt) return "That one is already done.";
  if (o.skippedAt) return "That one was skipped.";
  return null;
}

export type Completion = { doneBy: string | null; doneAt: Date; effort: number };


function checkedSchedule(schedule: Schedule): Schedule {
  if (schedule.kind === "every") {
    if (!Number.isInteger(schedule.days) || schedule.days < 1 || schedule.days > EVERY_DAYS_MAX) {
      throw new ValidationError(`Pick how often: every 1 to ${EVERY_DAYS_MAX} days.`);
    }
    return { kind: "every", days: schedule.days };
  }
  const days = [...new Set(schedule.days)].sort();
  if (days.length === 0 || days.some((d) => !Number.isInteger(d) || d < 1 || d > 7)) {
    throw new ValidationError("Pick at least one day of the week.");
  }
  return { kind: "weekdays", days };
}

function checkedText(input: NewChore) {
  const name = input.name.trim();
  if (!name) throw new ValidationError("Give the chore a name.");
  if (name.length > CHORE_NAME_MAX) throw new ValidationError(`Keep the name under ${CHORE_NAME_MAX} characters.`);
  const note = input.note?.trim() || null;
  if (note && note.length > CHORE_NOTE_MAX) throw new ValidationError(`Keep the note under ${CHORE_NOTE_MAX} characters.`);
  if (!Number.isInteger(input.effort) || input.effort < 1 || input.effort > EFFORT_MAX) {
    throw new ValidationError(`Effort is 1 to ${EFFORT_MAX} minutes.`);
  }
  return { name, note };
}

/** Where the Chore goes: a Fixture (and so its Room), a Room, or the Whole home. Both must be this home's. */
async function checkedPlace(db: Pick<Db, "select">, householdId: string, input: NewChore) {
  if (input.fixtureId) {
    const [fixture] = await db
      .select({ id: fixtures.id, roomId: fixtures.roomId })
      .from(fixtures)
      .where(and(eq(fixtures.id, idOf(input.fixtureId, "Fixture")), eq(fixtures.householdId, householdId)))
      .for("share");
    if (!fixture) throw new NotFoundError("Fixture");
    if (input.roomId && input.roomId !== fixture.roomId) throw new ValidationError("That fixture is in another room.");
    return { roomId: fixture.roomId, fixtureId: fixture.id };
  }
  if (input.roomId) {
    const [room] = await db
      .select({ id: rooms.id })
      .from(rooms)
      .where(and(eq(rooms.id, idOf(input.roomId, "Room")), eq(rooms.householdId, householdId)))
      .for("share");
    if (!room) throw new NotFoundError("Room");
    return { roomId: room.id, fixtureId: null };
  }
  return { roomId: null, fixtureId: null };
}

/** Any Member adds a Chore; its first Occurrence is due today (interval) or on its next weekday. */
/** Checks a new Chore's name, note, Effort and schedule, the way addChore does, without writing anything. */
export function checkNewChore(input: NewChore) {
  return { ...checkedText(input), schedule: checkedSchedule(input.schedule) };
}

export async function addChore(db: Db, userId: string, input: NewChore, now: Date): Promise<string> {
  const home = await householdOf(db, userId);
  const { name, note, schedule } = checkNewChore(input);
  return db.transaction(async (tx) => {
    // Checked inside the transaction, with the Room held, so it cannot be removed under us.
    const place = await checkedPlace(tx, home.id, input);
    const [chore] = await tx
      .insert(chores)
      .values({
        householdId: home.id,
        ...place,
        name,
        note,
        effort: input.effort,
        ...scheduleToColumns(schedule),
        createdBy: userId,
        libraryKey: input.libraryKey ?? null,
      })
      .returning({ id: chores.id });
    const first = firstDue(schedule, localDay(now, home.timeZone));
    const startsIn = schedule.kind === "every" && input.startsInDays ? Math.max(0, Math.min(input.startsInDays, schedule.days - 1)) : 0;
    await tx.insert(occurrences).values({ householdId: home.id, choreId: chore.id, dueOn: startsIn ? addDays(first, startsIn) : first });
    return chore.id;
  });
}

/** Today's list: every open Occurrence due today or earlier, the longest overdue first. */
export async function getToday(db: Db, userId: string, now: Date): Promise<TodayItem[]> {
  const home = await householdOf(db, userId);
  const today = localDay(now, home.timeZone);
  // Only a Claim that still holds today counts; a lapsed one is as if nobody had claimed it.
  const claimer = alias(user, "claimer");
  const rows = await db
    .select({
      occurrenceId: occurrences.id,
      choreId: chores.id,
      name: chores.name,
      note: chores.note,
      effort: chores.effort,
      roomId: chores.roomId,
      roomName: rooms.name,
      needsRoom: chores.needsRoom,
      fixtureType: fixtures.type,
      dueOn: occurrences.dueOn,
      postponedUntil: occurrences.postponedUntil,
      claimedBy: claimer.id,
      claimerName: claimer.name,
    })
    .from(occurrences)
    .innerJoin(chores, eq(chores.id, occurrences.choreId))
    .leftJoin(rooms, eq(rooms.id, chores.roomId))
    .leftJoin(fixtures, eq(fixtures.id, chores.fixtureId))
    .leftJoin(claimer, and(eq(claimer.id, occurrences.claimedBy), gte(occurrences.claimedUntil, today)))
    .where(and(eq(occurrences.householdId, home.id), isOpen(), lte(occurrences.dueOn, today)))
    .orderBy(asc(occurrences.dueOn), asc(chores.createdAt));
  // While Away, lateness stops growing at the day Away began.
  const lateUntil = home.awaySince && localDay(home.awaySince, home.timeZone) < today ? localDay(home.awaySince, home.timeZone) : today;
  const items = rows.map(({ claimedBy, claimerName, postponedUntil, ...r }) => {
    // Overdue: past its due day and not put off past now. A Za5 hides lateness while it lasts; it forgives none.
    const postponed = postponedUntil && postponedUntil > now ? postponedUntil : null;
    return {
      ...r,
      postponedUntil: postponed,
      overdueDays: postponed ? 0 : Math.max(0, daysBetween(r.dueOn, lateUntil)),
      claim: claimedBy ? { by: claimedBy, name: claimerName ?? "", mine: claimedBy === userId } : null,
    };
  });
  // Put-off ones go last; the rest stay oldest first.
  return [...items.filter((i) => !i.postponedUntil), ...items.filter((i) => i.postponedUntil)];
}

/** Locks one of this Household's Occurrences, still open, for a change; else not found, or why it is closed. */
export async function lockOpenOccurrence(tx: Pick<Db, "select">, householdId: string, occurrenceId: string) {
  const [row] = await tx
    .select({ occurrence: occurrences, chore: chores })
    .from(occurrences)
    .innerJoin(chores, eq(chores.id, occurrences.choreId))
    .where(and(eq(occurrences.id, idOf(occurrenceId, "Chore")), eq(occurrences.householdId, householdId)))
    .for("update", { of: occurrences });
  if (!row) throw new NotFoundError("Chore");
  const closed = closedReason(row.occurrence);
  if (closed) throw new ValidationError(closed);
  return row;
}

/**
 * Closes an Occurrence, Done or Skipped, and opens the next one, so a Chore never has more than one open.
 * Done credits the Member who did it and keeps the Effort as it was; Skip credits no one.
 */
async function closeOccurrence(db: Db, userId: string, occurrenceId: string, now: Date, how: "done" | "skipped"): Promise<{ nextDue: Day }> {
  const home = await householdOf(db, userId);
  const closedOn = localDay(now, home.timeZone);
  return db.transaction(async (tx) => {
    const row = await lockOpenOccurrence(tx, home.id, occurrenceId);
    await tx
      .update(occurrences)
      .set(how === "done" ? { completedAt: now, completedBy: userId, effort: row.chore.effort } : { skippedAt: now, skippedBy: userId })
      .where(eq(occurrences.id, occurrenceId));
    const nextDue = dueAfterDone(scheduleFromColumns(row.chore), row.occurrence.dueOn, closedOn);
    await tx.insert(occurrences).values({ householdId: home.id, choreId: row.chore.id, dueOn: nextDue });
    return { nextDue };
  });
}

/** Marks an Occurrence Done: the Member who did it gets the credit. */
export const completeOccurrence = (db: Db, userId: string, occurrenceId: string, now: Date) => closeOccurrence(db, userId, occurrenceId, now, "done");

/** Skips an Occurrence that isn't needed this time: no credit, and the next one comes as normal. */
export const skipOccurrence = (db: Db, userId: string, occurrenceId: string, now: Date) => closeOccurrence(db, userId, occurrenceId, now, "skipped");

/** Who did a Chore and when, most recent first, with the Effort as it was each time. */
export async function getHistory(db: Db, userId: string, choreId: string): Promise<Completion[]> {
  const home = await householdOf(db, userId);
  const rows = await db
    .select({ doneBy: occurrences.completedBy, doneAt: occurrences.completedAt, effort: occurrences.effort })
    .from(occurrences)
    .where(and(eq(occurrences.choreId, idOf(choreId, "Chore")), eq(occurrences.householdId, home.id), isNotNull(occurrences.completedAt)))
    .orderBy(desc(occurrences.completedAt));
  return rows.map((r) => ({ doneBy: r.doneBy, doneAt: r.doneAt!, effort: r.effort ?? 0 }));
}

/** Whether the Household has any Chore yet (the home screen offers the walkthrough until it does). */
export async function hasAnyChore(db: Db, userId: string): Promise<boolean> {
  const home = await householdOf(db, userId);
  const [row] = await db.select({ id: chores.id }).from(chores).where(eq(chores.householdId, home.id)).limit(1);
  return Boolean(row);
}
