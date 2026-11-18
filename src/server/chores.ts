import { and, asc, desc, eq, gte, isNotNull, isNull, lte } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { Db } from "@/db/client";
import { chores, fixtures, occurrences, rooms, user } from "@/db/schema";
import { CHORE_NAME_MAX, CHORE_NOTE_MAX, EFFORT_MAX, EVERY_DAYS_MAX } from "@/domain/limits";
import { daysBetween, dueAfterDone, firstDue, localDay, scheduleFromColumns, scheduleToColumns, type Day, type Schedule } from "@/domain/schedule";
import type { FixtureType } from "./home-types";
import { NotFoundError, ValidationError } from "./errors";
import { getMyHousehold } from "./households";

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
  /** Who has claimed it, while the Claim holds */
  claim: { by: string; name: string; mine: boolean } | null;
};

export type Completion = { doneBy: string | null; doneAt: Date; effort: number };

/** The current Member's Household (with its time zone); Members and the Owner alike. */
export async function householdOf(db: Db, userId: string) {
  const household = await getMyHousehold(db, userId);
  if (!household) throw new NotFoundError("Home");
  return household;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** An id from a form or a link; one that cannot be an id is simply not found (rather than a database error). */
export function idOf(id: string, what: string) {
  if (!UUID.test(id)) throw new NotFoundError(what);
  return id;
}

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
export async function addChore(db: Db, userId: string, input: NewChore, now: Date): Promise<string> {
  const home = await householdOf(db, userId);
  const { name, note } = checkedText(input);
  const schedule = checkedSchedule(input.schedule);
  return db.transaction(async (tx) => {
    // Checked inside the transaction, with the Room held, so it cannot be removed under us.
    const place = await checkedPlace(tx, home.id, input);
    const [chore] = await tx
      .insert(chores)
      .values({ householdId: home.id, ...place, name, note, effort: input.effort, ...scheduleToColumns(schedule), createdBy: userId })
      .returning({ id: chores.id });
    await tx.insert(occurrences).values({ householdId: home.id, choreId: chore.id, dueOn: firstDue(schedule, localDay(now, home.timeZone)) });
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
      claimedBy: claimer.id,
      claimerName: claimer.name,
    })
    .from(occurrences)
    .innerJoin(chores, eq(chores.id, occurrences.choreId))
    .leftJoin(rooms, eq(rooms.id, chores.roomId))
    .leftJoin(fixtures, eq(fixtures.id, chores.fixtureId))
    .leftJoin(claimer, and(eq(claimer.id, occurrences.claimedBy), gte(occurrences.claimedUntil, today)))
    .where(and(eq(occurrences.householdId, home.id), isNull(occurrences.completedAt), lte(occurrences.dueOn, today)))
    .orderBy(asc(occurrences.dueOn), asc(chores.createdAt));
  return rows.map(({ claimedBy, claimerName, ...r }) => ({
    ...r,
    overdueDays: daysBetween(r.dueOn, today),
    claim: claimedBy ? { by: claimedBy, name: claimerName ?? "", mine: claimedBy === userId } : null,
  }));
}

/**
 * Marks an Occurrence Done: credits the Member who did it, keeps the Effort as it was, and opens the next
 * Occurrence, so a Chore never has more than one open.
 */
export async function completeOccurrence(db: Db, userId: string, occurrenceId: string, now: Date): Promise<{ nextDue: Day }> {
  const home = await householdOf(db, userId);
  const doneOn = localDay(now, home.timeZone);
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select({ occurrence: occurrences, chore: chores })
      .from(occurrences)
      .innerJoin(chores, eq(chores.id, occurrences.choreId))
      .where(and(eq(occurrences.id, idOf(occurrenceId, "Chore")), eq(occurrences.householdId, home.id)))
      .for("update", { of: occurrences });
    if (!row) throw new NotFoundError("Chore");
    if (row.occurrence.completedAt) throw new ValidationError("That one is already done.");
    await tx.update(occurrences).set({ completedAt: now, completedBy: userId, effort: row.chore.effort }).where(eq(occurrences.id, occurrenceId));
    const nextDue = dueAfterDone(scheduleFromColumns(row.chore), row.occurrence.dueOn, doneOn);
    await tx.insert(occurrences).values({ householdId: home.id, choreId: row.chore.id, dueOn: nextDue });
    return { nextDue };
  });
}

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
