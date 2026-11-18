import { beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "@/db/setup";
import type { Db } from "@/db/client";
import { addMember, makeUser } from "@/test/helpers";
import { createHousehold } from "./households";
import { addChore, completeOccurrence, getHistory, getToday } from "./chores";
import { claimOccurrence, dismissDoneForYou, getDoneForYou, unclaimOccurrence } from "./claims";
import { NotAllowedError, NotFoundError, ValidationError } from "./errors";

/** A moment in Zagreb (UTC+1 in November). 2026-11-17 is a Tuesday. */
const at = (local: string) => new Date(local.replace(" ", "T") + ":00+01:00");

let db: Db;
let pope: string;
let ana: string;
let bathroomOccurrence: string;
let choreId: string;

beforeEach(async () => {
  db = await createTestDb();
  pope = await makeUser(db, "Pope");
  ana = await makeUser(db, "Ana");
  const home = await createHousehold(db, pope, "Omiš flat");
  await addMember(db, home.id, ana);
  choreId = await addChore(db, pope, { name: "Clean the bathroom", effort: 20, schedule: { kind: "every", days: 7 } }, at("2026-11-17 08:00"));
  [{ occurrenceId: bathroomOccurrence }] = await getToday(db, pope, at("2026-11-17 08:00"));
});

const claimOnToday = async (who: string, when: string) => (await getToday(db, who, at(when)))[0].claim;

describe("claiming", () => {
  it("shows everyone who has claimed an Occurrence", async () => {
    await claimOccurrence(db, ana, bathroomOccurrence, at("2026-11-17 09:00"));

    expect(await claimOnToday(pope, "2026-11-17 10:00")).toEqual({ by: ana, name: "Ana", mine: false });
    expect(await claimOnToday(ana, "2026-11-17 10:00")).toEqual({ by: ana, name: "Ana", mine: true });
  });

  it("does not let a second Member take a claimed Occurrence", async () => {
    await claimOccurrence(db, ana, bathroomOccurrence, at("2026-11-17 09:00"));

    await expect(claimOccurrence(db, pope, bathroomOccurrence, at("2026-11-17 09:05"))).rejects.toThrow(ValidationError);
  });

  it("puts it back in the pool when the claimer lets it go, and only the claimer can", async () => {
    await claimOccurrence(db, ana, bathroomOccurrence, at("2026-11-17 09:00"));

    await expect(unclaimOccurrence(db, pope, bathroomOccurrence, at("2026-11-17 09:10"))).rejects.toThrow(NotAllowedError);
    await unclaimOccurrence(db, ana, bathroomOccurrence, at("2026-11-17 09:10"));

    expect(await claimOnToday(pope, "2026-11-17 09:20")).toBeNull();
    await claimOccurrence(db, pope, bathroomOccurrence, at("2026-11-17 09:30"));
  });

  it("does not reach into another home", async () => {
    const zoe = await makeUser(db, "Zoe");
    await createHousehold(db, zoe, "Zoe's flat");

    await expect(claimOccurrence(db, zoe, bathroomOccurrence, at("2026-11-17 09:00"))).rejects.toThrow(NotFoundError);
  });
});

describe("a claim lapses at the end of the due day", () => {
  it("is gone just after midnight in Zagreb, and someone else can take it", async () => {
    await claimOccurrence(db, ana, bathroomOccurrence, at("2026-11-17 09:00"));

    expect(await claimOnToday(pope, "2026-11-17 23:59")).not.toBeNull();
    expect(await claimOnToday(pope, "2026-11-18 00:01")).toBeNull();
    await claimOccurrence(db, pope, bathroomOccurrence, at("2026-11-18 00:05"));
  });

  it("holds until the end of today when an overdue Occurrence is claimed", async () => {
    await claimOccurrence(db, ana, bathroomOccurrence, at("2026-11-20 09:00"));

    expect(await claimOnToday(pope, "2026-11-20 22:00")).toMatchObject({ name: "Ana" });
    expect(await claimOnToday(pope, "2026-11-21 00:01")).toBeNull();
  });
});

describe("someone else completing a claimed Occurrence", () => {
  it("credits whoever did it, and tells the claimer", async () => {
    await claimOccurrence(db, ana, bathroomOccurrence, at("2026-11-17 09:00"));

    await completeOccurrence(db, pope, bathroomOccurrence, at("2026-11-17 12:00"));

    expect((await getHistory(db, ana, choreId))[0].doneBy).toBe(pope);
    expect(await getDoneForYou(db, ana)).toEqual([{ occurrenceId: bathroomOccurrence, choreName: "Clean the bathroom", doneByName: "Pope", doneAt: at("2026-11-17 12:00") }]);
    expect(await getDoneForYou(db, pope)).toEqual([]);
  });

  it("stops showing the note once the claimer puts it away", async () => {
    await claimOccurrence(db, ana, bathroomOccurrence, at("2026-11-17 09:00"));
    await completeOccurrence(db, pope, bathroomOccurrence, at("2026-11-17 12:00"));

    await dismissDoneForYou(db, ana, bathroomOccurrence, at("2026-11-17 13:00"));

    expect(await getDoneForYou(db, ana)).toEqual([]);
  });

  it("sends no note when the claimer did it, or when the claim had already lapsed", async () => {
    await claimOccurrence(db, ana, bathroomOccurrence, at("2026-11-17 09:00"));
    await completeOccurrence(db, pope, bathroomOccurrence, at("2026-11-18 08:00"));

    expect(await getDoneForYou(db, ana)).toEqual([]);

    const [next] = await getToday(db, pope, at("2026-11-25 08:00"));
    await claimOccurrence(db, ana, next.occurrenceId, at("2026-11-25 08:00"));
    await completeOccurrence(db, ana, next.occurrenceId, at("2026-11-25 09:00"));
    expect(await getDoneForYou(db, ana)).toEqual([]);
  });
});
