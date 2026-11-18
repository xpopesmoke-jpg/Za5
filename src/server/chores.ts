import { and, asc, eq, isNull, lte } from "drizzle-orm";
import type { Db } from "@/db/client";
import { chores, fixtures, households, occurrences, rooms } from "@/db/schema";
import { CHORE_NAME_MAX, CHORE_NOTE_MAX, EFFORT_MAX, EVERY_DAYS_MAX } from "@/domain/limits";
import { daysBetween, dueAfterDone, firstDue, localDay, type Day, type Schedule } from "@/domain/schedule";
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
  fixtureType: FixtureType | null;
  dueOn: Day;
  /** 0 when due today */
  overdueDays: number;
};

/** The current Member's Household with its time zone; Members and the Owner alike. */
async function homeOf(db: Db, userId: string) {
  const mine = await getMyHousehold(db, userId);
  if (!mine) throw new NotFoundError("Home");
  const [row] = await db.select({ timeZone: households.timeZone }).from(households).where(eq(households.id, mine.id));
  return { id: mine.id, timeZone: row.timeZone };
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
async function checkedPlace(db: Db, householdId: string, input: NewChore) {
  if (input.fixtureId) {
    const [fixture] = await db
      .select({ id: fixtures.id, roomId: fixtures.roomId })
      .from(fixtures)
      .where(and(eq(fixtures.id, input.fixtureId), eq(fixtures.householdId, householdId)));
    if (!fixture) throw new NotFoundError("Fixture");
    if (input.roomId && input.roomId !== fixture.roomId) throw new ValidationError("That fixture is in another room.");
    return { roomId: fixture.roomId, fixtureId: fixture.id };
  }
  if (input.roomId) {
    const [room] = await db.select({ id: rooms.id }).from(rooms).where(and(eq(rooms.id, input.roomId), eq(rooms.householdId, householdId)));
    if (!room) throw new NotFoundError("Room");
    return { roomId: room.id, fixtureId: null };
  }
  return { roomId: null, fixtureId: null };
}

/** Any Member adds a Chore; its first Occurrence is due today (interval) or on its next weekday. */
export async function addChore(db: Db, userId: string, input: NewChore, now: Date): Promise<string> {
  const home = await homeOf(db, userId);
  const { name, note } = checkedText(input);
  const schedule = checkedSchedule(input.schedule);
  const place = await checkedPlace(db, home.id, input);
  return db.transaction(async (tx) => {
    const [chore] = await tx
      .insert(chores)
      .values({
        householdId: home.id,
        ...place,
        name,
        note,
        effort: input.effort,
        scheduleKind: schedule.kind,
        everyDays: schedule.kind === "every" ? schedule.days : null,
        weekdays: schedule.kind === "weekdays" ? schedule.days : null,
        createdBy: userId,
      })
      .returning({ id: chores.id });
    await tx.insert(occurrences).values({ householdId: home.id, choreId: chore.id, dueOn: firstDue(schedule, localDay(now, home.timeZone)) });
    return chore.id;
  });
}

/** Today's list: every open Occurrence due today or earlier, the longest overdue first. */
export async function getToday(db: Db, userId: string, now: Date): Promise<TodayItem[]> {
  const home = await homeOf(db, userId);
  const today = localDay(now, home.timeZone);
  const rows = await db
    .select({
      occurrenceId: occurrences.id,
      choreId: chores.id,
      name: chores.name,
      note: chores.note,
      effort: chores.effort,
      roomId: chores.roomId,
      roomName: rooms.name,
      fixtureType: fixtures.type,
      dueOn: occurrences.dueOn,
    })
    .from(occurrences)
    .innerJoin(chores, eq(chores.id, occurrences.choreId))
    .leftJoin(rooms, eq(rooms.id, chores.roomId))
    .leftJoin(fixtures, eq(fixtures.id, chores.fixtureId))
    .where(and(eq(occurrences.householdId, home.id), isNull(occurrences.completedAt), lte(occurrences.dueOn, today)))
    .orderBy(asc(occurrences.dueOn), asc(chores.createdAt));
  return rows.map((r) => ({ ...r, overdueDays: daysBetween(r.dueOn, today) }));
}

/**
 * Marks an Occurrence Done: credits the Member who did it, keeps the Effort as it was, and opens the next
 * Occurrence, so a Chore never has more than one open.
 */
export async function completeOccurrence(db: Db, userId: string, occurrenceId: string, now: Date): Promise<{ nextDue: Day }> {
  const home = await homeOf(db, userId);
  const doneOn = localDay(now, home.timeZone);
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select({ occurrence: occurrences, chore: chores })
      .from(occurrences)
      .innerJoin(chores, eq(chores.id, occurrences.choreId))
      .where(and(eq(occurrences.id, occurrenceId), eq(occurrences.householdId, home.id)))
      .for("update", { of: occurrences });
    if (!row) throw new NotFoundError("Chore");
    if (row.occurrence.completedAt) throw new ValidationError("That one is already done.");
    await tx.update(occurrences).set({ completedAt: now, completedBy: userId, effort: row.chore.effort }).where(eq(occurrences.id, occurrenceId));
    const schedule: Schedule =
      row.chore.scheduleKind === "every"
        ? { kind: "every", days: row.chore.everyDays! }
        : { kind: "weekdays", days: row.chore.weekdays! };
    const nextDue = dueAfterDone(schedule, doneOn);
    await tx.insert(occurrences).values({ householdId: home.id, choreId: row.chore.id, dueOn: nextDue });
    return { nextDue };
  });
}
