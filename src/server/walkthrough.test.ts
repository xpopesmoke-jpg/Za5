import { beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "@/db/setup";
import type { Db } from "@/db/client";
import { addMember, makeUser } from "@/test/helpers";
import { createHousehold } from "./households";
import { addFixture, addFloor, addRoom, getHome } from "./home";
import { getToday } from "./chores";
import { getSetupStep, getSetupSteps, saveSetupStep } from "./walkthrough";
import { NotAllowedError } from "./errors";

const at = (local: string) => new Date(local.replace(" ", "T") + ":00+01:00");
const now = at("2026-11-19 10:00");

let db: Db;
let pope: string;
let homeId: string;
let ground: string;
let kitchen: string;
let bathroom: string;

beforeEach(async () => {
  db = await createTestDb();
  pope = await makeUser(db, "Pope");
  homeId = (await createHousehold(db, pope, "Omiš flat")).id;
  ground = (await getHome(db, pope)).floors[0].id;
  kitchen = await addRoom(db, pope, ground, { type: "living", name: "Living + kitchen" });
  await addFixture(db, pope, kitchen, "hob");
  bathroom = await addRoom(db, pope, ground, { type: "bathroom", name: "Bathroom" });
  await addFixture(db, pope, bathroom, "shower");
  await addFixture(db, pope, bathroom, "toilet");
});

/** Far enough ahead that every Chore kept in a test has come due (they start spread over their intervals). */
const later = at("2027-01-05 10:00");
const byName = <T extends { name: string }>(xs: T[]) => [...xs].sort((a, b) => a.name.localeCompare(b.name));
const suggestedKeys = async (roomId: string | null) => (await getSetupStep(db, pope, roomId, "en")).suggestions.map((s) => s.key);
const todayNames = async () => byName(await getToday(db, pope, later)).map((o) => o.name);

describe("the walkthrough's order", () => {
  it("visits every Room, floor by floor in order, then the Whole home", async () => {
    const upstairs = await addFloor(db, pope);
    const kids = await addRoom(db, pope, upstairs, { type: "kids", name: "Kids" });

    expect((await getSetupSteps(db, pope)).map((s) => (s.kind === "room" ? s.roomId : "whole"))).toEqual([kitchen, bathroom, kids, "whole"]);
  });
});

describe("a Room's suggestions", () => {
  it("come from the Room's type and Fixtures, in the Owner's language, with their defaults", async () => {
    const step = await getSetupStep(db, pope, bathroom, "hr");
    const shower = step.suggestions.find((s) => s.key === "clean-shower")!;

    expect(shower).toMatchObject({ name: "Očisti tuš-kabinu", everyDays: 7, effort: 15, fixtureType: "shower" });
    expect(step.suggestions.map((s) => s.key)).not.toContain("clean-oven");
  });

  it("turns the kept ones into Chores with their defaults, at their Fixture, and leaves the dropped ones out", async () => {
    await saveSetupStep(db, pope, bathroom, { keep: [{ key: "clean-shower" }, { key: "clean-toilet" }], extra: [] }, "en", now);

    const today = byName(await getToday(db, pope, later));
    expect(today.map((o) => [o.name, o.roomName, o.fixtureType, o.effort])).toEqual([
      ["Clean the shower", "Bathroom", "shower", 15],
      ["Clean the toilet", "Bathroom", "toilet", 10],
    ]);
  });

  it("takes changed frequency, Effort and a note", async () => {
    await saveSetupStep(db, pope, bathroom, { keep: [{ key: "clean-shower", everyDays: 3, effort: 20, note: "Squeegee the glass" }], extra: [] }, "en", now);

    const [shower] = await getToday(db, pope, later);
    expect([shower.effort, shower.note]).toEqual([20, "Squeegee the glass"]);
    expect((await getSetupStep(db, pope, bathroom, "en")).added).toEqual([expect.objectContaining({ name: "Clean the shower", everyDays: 3, effort: 20 })]);
  });

  it("adds Chores the library missed, to that Room", async () => {
    await saveSetupStep(db, pope, kitchen, { keep: [], extra: [{ name: "Descale the espresso machine", everyDays: 30, effort: 15, note: "Citric acid, not vinegar" }] }, "en", now);

    expect((await getToday(db, pope, later)).map((o) => [o.name, o.roomName, o.note])).toEqual([["Descale the espresso machine", "Living + kitchen", "Citric acid, not vinegar"]]);
  });

  it("ignores keys that are not suggestions for that Room", async () => {
    await saveSetupStep(db, pope, bathroom, { keep: [{ key: "clean-oven" }, { key: "made-up" }], extra: [] }, "en", now);

    expect(await todayNames()).toEqual([]);
  });
});

describe("the Whole home step", () => {
  it("suggests the Whole-home Chores and takes extra ones there", async () => {
    expect(await suggestedKeys(null)).toEqual(expect.arrayContaining(["water-plants", "pay-bills"]));

    await saveSetupStep(db, pope, null, { keep: [{ key: "pay-bills" }], extra: [{ name: "Check the post box", everyDays: 7, effort: 2 }] }, "en", now);

    expect(byName(await getToday(db, pope, later)).map((o) => [o.name, o.roomName])).toEqual([
      ["Check the post box", null],
      ["Pay the bills", null],
    ]);
  });
});

describe("reopening a Room later", () => {
  it("shows what is already there and does not add it twice", async () => {
    await saveSetupStep(db, pope, bathroom, { keep: [{ key: "clean-shower" }], extra: [] }, "en", now);

    const step = await getSetupStep(db, pope, bathroom, "en");
    expect(step.added.map((c) => c.name)).toEqual(["Clean the shower"]);
    expect(step.suggestions.map((s) => s.key)).not.toContain("clean-shower");

    await saveSetupStep(db, pope, bathroom, { keep: [{ key: "clean-shower" }, { key: "clean-toilet" }], extra: [] }, "en", now);
    expect(await todayNames()).toEqual(["Clean the shower", "Clean the toilet"]);
  });
});

describe("who walks through", () => {
  it("is the Owner; a Member can't save a step", async () => {
    const nina = await makeUser(db, "Nina");
    await addMember(db, homeId, nina);

    await expect(saveSetupStep(db, nina, bathroom, { keep: [{ key: "clean-shower" }], extra: [] }, "en", now)).rejects.toThrow(NotAllowedError);
  });
});

describe("the first days after setup", () => {
  it("spreads first due days over each Chore's interval, so day one isn't everything", async () => {
    const keys = (await getSetupStep(db, pope, kitchen, "en")).suggestions.map((s) => ({ key: s.key }));
    await saveSetupStep(db, pope, kitchen, { keep: keys, extra: [] }, "en", now);
    const kept = keys.length;

    const dayOne = (await getToday(db, pope, now)).length;
    const weekLater = (await getToday(db, pope, at("2026-11-26 10:00"))).length;
    const daily = (await getSetupStep(db, pope, kitchen, "en")).added.filter((c) => c.everyDays === 1).length;

    expect(dayOne).toBeLessThan(kept / 2);
    expect(dayOne).toBeGreaterThanOrEqual(daily);
    // within a week every Chore that comes at least weekly has been due once
    const weeklyOrMore = (await getSetupStep(db, pope, kitchen, "en")).added.filter((c) => (c.everyDays ?? 99) <= 7).length;
    expect(weekLater).toBeGreaterThanOrEqual(weeklyOrMore);
  });
});
