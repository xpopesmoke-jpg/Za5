import { beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "@/db/setup";
import type { Db } from "@/db/client";
import { addMember, makeUser } from "@/test/helpers";
import { createHousehold } from "./households";
import { addChore, completeOccurrence, getHistory, getToday, skipOccurrence } from "./chores";
import { getZa5Count, za5Occurrence } from "./za5";
import { getAway, setAway } from "./away";
import { getFairness } from "./fairness";
import { ValidationError } from "./errors";

/** A moment in Zagreb (UTC+1 in November). 2026-11-17 is a Tuesday. */
const at = (local: string) => new Date(local.replace(" ", "T") + ":00+01:00");
const weekly = { kind: "every", days: 7 } as const;

let db: Db;
let pope: string;
let nina: string;

beforeEach(async () => {
  db = await createTestDb();
  pope = await makeUser(db, "Pope");
  nina = await makeUser(db, "Nina");
  const home = await createHousehold(db, pope, "Omiš flat");
  await addMember(db, home.id, nina);
});

const addAndOpen = async (name: string, when: string, schedule: Parameters<typeof addChore>[2]["schedule"] = weekly, effort = 20) => {
  const choreId = await addChore(db, pope, { name, effort, schedule }, at(when));
  const item = (await getToday(db, pope, at(when))).find((o) => o.choreId === choreId)!;
  return { choreId, occurrenceId: item.occurrenceId };
};
const today = async (when: string) => (await getToday(db, pope, at(when))).map((o) => [o.name, o.dueOn, o.overdueDays, o.postponedUntil?.toISOString() ?? null]);

describe("Skip", () => {
  it("drops the Occurrence with no credit, and the next one comes as normal", async () => {
    const { choreId, occurrenceId } = await addAndOpen("Water the terrace plants", "2026-11-17 08:00");

    const { nextDue } = await skipOccurrence(db, nina, occurrenceId, at("2026-11-17 09:00"));

    expect(nextDue).toBe("2026-11-24");
    expect(await today("2026-11-17 10:00")).toEqual([]);
    expect(await getHistory(db, pope, choreId)).toEqual([]);
    expect((await getFairness(db, pope, at("2026-11-17 10:00"))).map((m) => m.minutes)).toEqual([0, 0]);
  });

  it("moves a fixed-days Chore to its next day, as Done would", async () => {
    // 2026-11-19 is a Thursday; bins go out Mondays and Thursdays.
    const { occurrenceId } = await addAndOpen("Take out the bins", "2026-11-19 07:00", { kind: "weekdays", days: [1, 4] }, 5);

    expect((await skipOccurrence(db, nina, occurrenceId, at("2026-11-19 08:00"))).nextDue).toBe("2026-11-23");
  });

  it("cannot be done once Skipped, and cannot be Skipped twice", async () => {
    const { occurrenceId } = await addAndOpen("Water the terrace plants", "2026-11-17 08:00");
    await skipOccurrence(db, nina, occurrenceId, at("2026-11-17 09:00"));

    await expect(completeOccurrence(db, pope, occurrenceId, at("2026-11-17 09:05"))).rejects.toThrow(ValidationError);
    await expect(skipOccurrence(db, pope, occurrenceId, at("2026-11-17 09:05"))).rejects.toThrow(ValidationError);
  });
});

describe("Za5", () => {
  it("puts it off until later today: still on the list, marked, after the rest, and not overdue meanwhile", async () => {
    const shower = await addAndOpen("Clean the shower", "2026-11-15 08:00");
    await addAndOpen("Take out the bins", "2026-11-17 08:00");

    const { until } = await za5Occurrence(db, pope, shower.occurrenceId, "later", at("2026-11-17 09:00"));

    expect(until).toEqual(at("2026-11-17 12:00"));
    expect(await today("2026-11-17 10:00")).toEqual([
      ["Take out the bins", "2026-11-17", 0, null],
      ["Clean the shower", "2026-11-15", 0, at("2026-11-17 12:00").toISOString()],
    ]);
  });

  it("does not forgive lateness: once the Za5 time has passed, it is as late as it really is", async () => {
    const { occurrenceId } = await addAndOpen("Clean the shower", "2026-11-12 08:00");
    await za5Occurrence(db, pope, occurrenceId, "later", at("2026-11-17 09:00"));

    expect((await today("2026-11-17 12:30"))[0]).toEqual(["Clean the shower", "2026-11-12", 5, null]);
  });

  it("puts it off until tomorrow at 07:00, not overdue until then", async () => {
    const { occurrenceId } = await addAndOpen("Clean the shower", "2026-11-17 08:00");

    await za5Occurrence(db, nina, occurrenceId, "tomorrow", at("2026-11-17 21:00"));

    expect((await today("2026-11-18 06:30"))[0]).toEqual(["Clean the shower", "2026-11-17", 0, at("2026-11-18 07:00").toISOString()]);
    expect((await today("2026-11-18 08:00"))[0]).toEqual(["Clean the shower", "2026-11-17", 1, null]);
  });

  it("makes \"later today\" mean tomorrow morning when the day is nearly over", async () => {
    const { occurrenceId } = await addAndOpen("Clean the shower", "2026-11-17 08:00");

    expect((await za5Occurrence(db, pope, occurrenceId, "later", at("2026-11-17 22:30"))).until).toEqual(at("2026-11-18 07:00"));
  });

  it("counts each Member's presses this calendar month", async () => {
    const a = await addAndOpen("Clean the shower", "2026-10-31 08:00");
    await za5Occurrence(db, pope, a.occurrenceId, "tomorrow", at("2026-10-31 09:00"));
    await za5Occurrence(db, pope, a.occurrenceId, "later", at("2026-11-01 09:00"));
    await za5Occurrence(db, pope, a.occurrenceId, "tomorrow", at("2026-11-17 20:00"));

    expect(await getZa5Count(db, pope, at("2026-11-17 21:00"))).toBe(2);
    expect(await getZa5Count(db, nina, at("2026-11-17 21:00"))).toBe(0);
  });

  it("never touches the Fairness balance: whoever does it later gets the minutes", async () => {
    const { occurrenceId } = await addAndOpen("Clean the shower", "2026-11-17 08:00");
    await za5Occurrence(db, pope, occurrenceId, "tomorrow", at("2026-11-17 09:00"));

    await completeOccurrence(db, nina, occurrenceId, at("2026-11-18 19:00"));

    const balance = await getFairness(db, pope, at("2026-11-18 20:00"));
    expect(balance.map((m) => [m.name, m.minutes])).toEqual([
      ["Pope", 0],
      ["Nina", 20],
    ]);
  });
});

describe("Away", () => {
  it("lets nothing become overdue while the Household is away", async () => {
    await addAndOpen("Already late", "2026-11-19 08:00");
    await addAndOpen("Due while away", "2026-11-22 08:00");
    await setAway(db, nina, true, at("2026-11-20 07:00"));

    expect(await getAway(db, pope)).toEqual({ since: at("2026-11-20 07:00") });
    expect(await today("2026-11-28 10:00")).toEqual([
      ["Already late", "2026-11-19", 1, null],
      ["Due while away", "2026-11-22", 0, null],
    ]);
  });

  it("picks the schedule up from the return day, keeping what was late before as late as it was", async () => {
    await addAndOpen("Already late", "2026-11-19 08:00");
    await addAndOpen("Due while away", "2026-11-22 08:00");
    await setAway(db, nina, true, at("2026-11-20 07:00"));

    await setAway(db, pope, false, at("2026-11-30 18:00"));

    expect(await getAway(db, pope)).toBeNull();
    expect(await today("2026-11-30 19:00")).toEqual([
      ["Already late", "2026-11-29", 1, null],
      ["Due while away", "2026-11-30", 0, null],
    ]);
  });
});
