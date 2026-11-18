import { beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "@/db/setup";
import type { Db } from "@/db/client";
import { addMember, makeUser } from "@/test/helpers";
import { createHousehold } from "./households";
import { addFixture, addFloor, addRoom, getHome, removeFloor, removeRoom } from "./home";
import { NotFoundError, ValidationError } from "./errors";
import type { Schedule } from "@/domain/schedule";
import { addChore, completeOccurrence, getHistory, getToday } from "./chores";

/** A moment in the home's time zone (Zagreb, UTC+1 in November): "2026-11-17 09:00". */
const at = (local: string) => new Date(local.replace(" ", "T") + ":00+01:00");

let db: Db;
let pope: string;
let ana: string;
let bathroom: string;

beforeEach(async () => {
  db = await createTestDb();
  pope = await makeUser(db, "Pope");
  ana = await makeUser(db, "Ana");
  const home = await createHousehold(db, pope, "Omiš flat");
  await addMember(db, home.id, ana);
  const [floor] = (await getHome(db, pope)).floors;
  bathroom = await addRoom(db, pope, floor.id, { type: "bathroom", name: "Bathroom" });
});

const weekly = { kind: "every", days: 7 } as const;

/** The open Occurrence of the only Chore, looked up on its due day (Thursday 19 Nov). */
async function getTodayOrLater(userId: string) {
  const [item] = await getToday(db, userId, at("2026-11-19 07:00"));
  return item.occurrenceId;
}

describe("adding a Chore", () => {
  it("makes a new interval Chore due today, on Today's list", async () => {
    await addChore(db, pope, { name: "Clean the bathroom", roomId: bathroom, effort: 20, schedule: weekly }, at("2026-11-17 09:00"));

    const today = await getToday(db, ana, at("2026-11-17 10:00"));

    expect(today.map((o) => [o.name, o.roomName, o.dueOn, o.overdueDays])).toEqual([["Clean the bathroom", "Bathroom", "2026-11-17", 0]]);
  });
});

describe("marking an Occurrence Done", () => {
  it("records who did it and when, and takes it off Today's list until it is due again", async () => {
    await addChore(db, pope, { name: "Clean the bathroom", roomId: bathroom, effort: 20, schedule: weekly }, at("2026-11-17 09:00"));
    const [item] = await getToday(db, pope, at("2026-11-17 09:00"));

    const { nextDue } = await completeOccurrence(db, ana, item.occurrenceId, at("2026-11-17 18:30"));

    expect(nextDue).toBe("2026-11-24");
    expect(await getToday(db, pope, at("2026-11-23 09:00"))).toEqual([]);
    expect((await getToday(db, pope, at("2026-11-24 09:00"))).map((o) => o.name)).toEqual(["Clean the bathroom"]);
    expect(await getHistory(db, pope, item.choreId)).toEqual([{ doneBy: ana, doneAt: at("2026-11-17 18:30"), effort: 20 }]);
  });

  it("refuses to mark the same Occurrence Done twice", async () => {
    await addChore(db, pope, { name: "Wipe the mirror", roomId: bathroom, effort: 5, schedule: weekly }, at("2026-11-17 09:00"));
    const [item] = await getToday(db, pope, at("2026-11-17 09:00"));
    await completeOccurrence(db, pope, item.occurrenceId, at("2026-11-17 10:00"));

    await expect(completeOccurrence(db, ana, item.occurrenceId, at("2026-11-17 10:01"))).rejects.toThrow(ValidationError);
  });
});

describe("overdue Chores", () => {
  it("keeps one overdue Occurrence on Today's list, however many due days pass", async () => {
    await addChore(db, pope, { name: "Clean the bathroom", roomId: bathroom, effort: 20, schedule: weekly }, at("2026-11-01 09:00"));

    const today = await getToday(db, pope, at("2026-11-20 09:00"));

    expect(today.map((o) => [o.dueOn, o.overdueDays])).toEqual([["2026-11-01", 19]]);
  });

  it("counts an interval from the day it was actually done, not the day it was due", async () => {
    await addChore(db, pope, { name: "Clean the bathroom", roomId: bathroom, effort: 20, schedule: weekly }, at("2026-11-01 09:00"));
    const [late] = await getToday(db, pope, at("2026-11-10 09:00"));

    expect((await completeOccurrence(db, pope, late.occurrenceId, at("2026-11-10 20:00"))).nextDue).toBe("2026-11-17");
  });

  it("lists the longest overdue first", async () => {
    await addChore(db, pope, { name: "Newer", effort: 5, schedule: weekly }, at("2026-11-15 09:00"));
    await addChore(db, pope, { name: "Older", effort: 5, schedule: weekly }, at("2026-11-10 09:00"));

    expect((await getToday(db, pope, at("2026-11-17 09:00"))).map((o) => o.name)).toEqual(["Older", "Newer"]);
  });
});

describe("fixed-days schedules", () => {
  // 2026-11-17 is a Tuesday.
  const monThu: Schedule = { kind: "weekdays", days: [1, 4] };

  it("is first due on its next day of the week", async () => {
    await addChore(db, pope, { name: "Take out the bins", effort: 5, schedule: monThu }, at("2026-11-17 09:00"));

    expect(await getToday(db, pope, at("2026-11-17 09:00"))).toEqual([]);
    expect((await getToday(db, pope, at("2026-11-19 07:00"))).map((o) => o.dueOn)).toEqual(["2026-11-19"]);
  });

  it("moves to the next matching day after it is done, even when done late", async () => {
    await addChore(db, pope, { name: "Take out the bins", effort: 5, schedule: monThu }, at("2026-11-17 09:00"));
    const [thu] = await getToday(db, pope, at("2026-11-19 07:00"));

    // Done on Saturday, two days late: the next one is Monday, not Saturday + something.
    expect((await completeOccurrence(db, pope, thu.occurrenceId, at("2026-11-21 11:00"))).nextDue).toBe("2026-11-23");
  });

  it("keeps one Occurrence when its days pass for weeks without anyone doing it", async () => {
    await addChore(db, pope, { name: "Take out the bins", effort: 5, schedule: monThu }, at("2026-11-17 09:00"));

    const today = await getToday(db, pope, at("2026-12-10 09:00"));

    expect(today.map((o) => [o.dueOn, o.overdueDays])).toEqual([["2026-11-19", 21]]);
  });

  it("never makes a fixed-days Chore due again on the same day when it is done early", async () => {
    await addChore(db, pope, { name: "Take out the bins", effort: 5, schedule: monThu }, at("2026-11-17 09:00"));
    const due = await getTodayOrLater(pope);

    // Done on Tuesday for Thursday: the next one is the Monday after that Thursday.
    expect((await completeOccurrence(db, pope, due, at("2026-11-17 20:00"))).nextDue).toBe("2026-11-23");
  });

  it("refuses a fixed-days schedule with no days", async () => {
    await expect(addChore(db, pope, { name: "Bins", effort: 5, schedule: { kind: "weekdays", days: [] } }, at("2026-11-17 09:00"))).rejects.toThrow(
      ValidationError,
    );
  });
});

describe("the home's own day", () => {
  it("counts 00:30 in Zagreb as the new day, though it is still yesterday in UTC", async () => {
    await addChore(db, pope, { name: "Water the indoor plants", effort: 10, schedule: { kind: "every", days: 3 } }, at("2026-11-18 00:30"));

    expect((await getToday(db, pope, at("2026-11-18 00:30"))).map((o) => o.dueOn)).toEqual(["2026-11-18"]);
  });
});

describe("where a Chore goes", () => {
  it("puts a Chore at a Fixture in its Room, or in the Whole home", async () => {
    const shower = await addFixture(db, pope, bathroom, "shower");
    await addChore(db, ana, { name: "Clean the shower", fixtureId: shower, effort: 15, schedule: weekly }, at("2026-11-17 09:00"));
    await addChore(db, ana, { name: "Pay the bills", effort: 15, schedule: { kind: "every", days: 30 } }, at("2026-11-17 09:00"));

    const today = await getToday(db, pope, at("2026-11-17 09:00"));

    expect(today.map((o) => [o.name, o.roomName, o.fixtureType])).toEqual([
      ["Clean the shower", "Bathroom", "shower"],
      ["Pay the bills", null, null],
    ]);
  });

  it("answers a made-up id as not found rather than failing", async () => {
    await expect(addChore(db, pope, { name: "Odd", roomId: "abc", effort: 5, schedule: weekly }, at("2026-11-17 09:00"))).rejects.toThrow(NotFoundError);
    await expect(completeOccurrence(db, pope, "not-an-id", at("2026-11-17 09:00"))).rejects.toThrow(NotFoundError);
  });

  it("does not let a Member use another home's Room, or touch another home's Occurrences", async () => {
    const zoe = await makeUser(db, "Zoe");
    await createHousehold(db, zoe, "Zoe's flat");
    await addChore(db, pope, { name: "Clean the bathroom", roomId: bathroom, effort: 20, schedule: weekly }, at("2026-11-17 09:00"));
    const [item] = await getToday(db, pope, at("2026-11-17 09:00"));

    await expect(addChore(db, zoe, { name: "Sneaky", roomId: bathroom, effort: 5, schedule: weekly }, at("2026-11-17 09:00"))).rejects.toThrow(NotFoundError);
    await expect(completeOccurrence(db, zoe, item.occurrenceId, at("2026-11-17 10:00"))).rejects.toThrow(NotFoundError);
    expect(await getToday(db, zoe, at("2026-11-17 10:00"))).toEqual([]);
  });

  it("keeps a removed Room's Chores, waiting for a new Room", async () => {
    const choreId = await addChore(db, pope, { name: "Clean the bathroom", roomId: bathroom, effort: 20, schedule: weekly }, at("2026-11-17 09:00"));

    await removeRoom(db, pope, bathroom);

    const today = await getToday(db, pope, at("2026-11-17 10:00"));
    expect(today.map((o) => [o.choreId, o.roomId, o.needsRoom])).toEqual([[choreId, null, true]]);
  });
});

describe("removing a Floor", () => {
  it("keeps the Chores of its Rooms too, waiting for a new Room", async () => {
    const upstairs = await addFloor(db, pope);
    const kids = await addRoom(db, pope, upstairs, { type: "kids", name: "Kids" });
    const choreId = await addChore(db, pope, { name: "Tidy the toys", roomId: kids, effort: 10, schedule: weekly }, at("2026-11-17 09:00"));

    await removeFloor(db, pope, upstairs);

    const today = await getToday(db, pope, at("2026-11-17 10:00"));
    expect(today.map((o) => [o.choreId, o.roomId, o.needsRoom])).toEqual([[choreId, null, true]]);
  });
});
