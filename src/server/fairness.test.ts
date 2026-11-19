import { beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "@/db/setup";
import type { Db } from "@/db/client";
import { addMember, makeUser } from "@/test/helpers";
import { createHousehold } from "./households";
import { addChore, completeOccurrence, getToday, skipOccurrence } from "./chores";
import { getFairness } from "./fairness";

const at = (local: string) => new Date(local.replace(" ", "T") + ":00+01:00");
const daily = { kind: "every", days: 1 } as const;

let db: Db;
let pope: string;
let nina: string;
let homeId: string;

beforeEach(async () => {
  db = await createTestDb();
  pope = await makeUser(db, "Pope");
  nina = await makeUser(db, "Nina");
  homeId = (await createHousehold(db, pope, "Omiš flat")).id;
  await addMember(db, homeId, nina);
});

/** Does today's Occurrence of the Chore as `who`, or Skips it. */
async function act(who: string, choreId: string, when: string, how: "done" | "skip" = "done") {
  const item = (await getToday(db, who, at(when))).find((o) => o.choreId === choreId)!;
  if (how === "done") await completeOccurrence(db, who, item.occurrenceId, at(when));
  else await skipOccurrence(db, who, item.occurrenceId, at(when));
}

const balance = async (when: string) => (await getFairness(db, pope, at(when))).map((m) => [m.name, m.minutes, m.isMe]);

describe("the Fairness balance", () => {
  it("adds up each Member's Effort for what they completed, over the last 30 days only", async () => {
    const dishes = await addChore(db, pope, { name: "Empty the dishwasher", effort: 5, schedule: daily }, at("2026-10-01 08:00"));
    await act(pope, dishes, "2026-10-01 20:00"); // more than 30 days before 20 Nov: not counted
    await act(nina, dishes, "2026-10-25 20:00");
    await act(pope, dishes, "2026-11-10 20:00");
    await act(pope, dishes, "2026-11-19 20:00");

    expect(await balance("2026-11-20 09:00")).toEqual([
      ["Pope", 10, true],
      ["Nina", 5, false],
    ]);
  });

  it("gives nothing for a Skip", async () => {
    const dishes = await addChore(db, pope, { name: "Empty the dishwasher", effort: 5, schedule: daily }, at("2026-11-18 08:00"));
    await act(nina, dishes, "2026-11-18 20:00", "skip");

    expect(await balance("2026-11-19 09:00")).toEqual([
      ["Pope", 0, true],
      ["Nina", 0, false],
    ]);
  });

  it("uses the Effort a Chore had when it was done", async () => {
    const shower = await addChore(db, pope, { name: "Clean the shower", effort: 15, schedule: daily }, at("2026-11-18 08:00"));
    await act(nina, shower, "2026-11-18 20:00");

    expect(await balance("2026-11-19 09:00")).toEqual([
      ["Pope", 0, true],
      ["Nina", 15, false],
    ]);
  });

  it("shows every current Member, and leaves out other homes", async () => {
    const zoe = await makeUser(db, "Zoe");
    await createHousehold(db, zoe, "Zoe's flat");
    const theirs = await addChore(db, zoe, { name: "Their dishes", effort: 30, schedule: daily }, at("2026-11-18 08:00"));
    await act(zoe, theirs, "2026-11-18 20:00");

    expect(await balance("2026-11-19 09:00")).toEqual([
      ["Pope", 0, true],
      ["Nina", 0, false],
    ]);
  });
});
