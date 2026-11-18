import { describe, expect, it } from "vitest";
import { suggest, type HomeRoom } from "./library";
import { LIBRARY_CHORES, LIBRARY_SUPPLIES } from "./library-data";

const bathroom: HomeRoom = { id: "bath", type: "bathroom", fixtures: ["shower", "toilet", "sink"] };

const choreKeysFor = (rooms: HomeRoom[], roomId: string | null) =>
  suggest(rooms).chores.filter((s) => s.roomId === roomId).map((s) => s.chore.key);

describe("suggesting Chores for a home", () => {
  it("gives a bathroom with a shower and a toilet its bathroom Chores, and no kitchen ones", () => {
    const keys = choreKeysFor([bathroom], "bath");

    expect(keys).toEqual(expect.arrayContaining(["clean-toilet", "clean-shower", "mop-bathroom", "wipe-mirror"]));
    expect(keys).not.toContain("clean-oven");
    expect(keys).not.toContain("wash-dishes");
  });
});

describe("rooms that share a job", () => {
  it("gives a living room with a hob the kitchen Chores as well as the living-room ones", () => {
    const keys = choreKeysFor([{ id: "lk", type: "living", fixtures: ["hob", "sink"] }], "lk");

    expect(keys).toEqual(expect.arrayContaining(["wash-dishes", "clean-hob", "tidy-living", "vacuum-sofa"]));
    expect(keys).not.toContain("clean-oven");
  });

  it("leaves out shower Chores when the bathroom has only a bathtub", () => {
    const keys = choreKeysFor([{ id: "b", type: "bathroom", fixtures: ["bathtub"] }], "b");

    expect(keys).toContain("clean-bathtub");
    expect(keys).not.toContain("clean-shower");
  });

  it("gives each of two bathrooms its own copy of a Chore", () => {
    const rooms: HomeRoom[] = [bathroom, { ...bathroom, id: "bath-2" }];

    expect(choreKeysFor(rooms, "bath")).toContain("clean-toilet");
    expect(choreKeysFor(rooms, "bath-2")).toContain("clean-toilet");
  });
});

describe("the Whole home", () => {
  it("always gets the Whole-home Chores, even with no Rooms yet", () => {
    expect(choreKeysFor([], null)).toEqual(expect.arrayContaining(["water-plants", "pay-bills", "test-smoke-alarm"]));
  });
});

describe("suggesting Supplies", () => {
  it("puts each Supply once, in the first Room it fits, and general ones in the Whole home", () => {
    const rooms: HomeRoom[] = [{ id: "k", type: "kitchen", fixtures: ["dishwasher"] }, bathroom, { ...bathroom, id: "bath-2" }];
    const placed = Object.fromEntries(suggest(rooms).supplies.map((s) => [s.supply.key, s.roomId]));

    expect(placed["dishwasher-tablets"]).toBe("k");
    expect(placed["toilet-paper"]).toBe("bath");
    expect(placed["light-bulbs"]).toBeNull();
    expect(suggest(rooms).supplies.filter((s) => s.supply.key === "toilet-paper")).toHaveLength(1);
  });

  it("leaves out Supplies the home has no place for", () => {
    const keys = suggest([bathroom]).supplies.map((s) => s.supply.key);

    expect(keys).not.toContain("dishwasher-tablets");
    expect(keys).not.toContain("plant-food");
  });
});

describe("the starter library itself", () => {
  const all = [...LIBRARY_CHORES, ...LIBRARY_SUPPLIES];

  it("has about 80 Chores and 30 Supplies, each with its own key", () => {
    expect(LIBRARY_CHORES.length).toBeGreaterThanOrEqual(75);
    expect(LIBRARY_SUPPLIES.length).toBeGreaterThanOrEqual(28);
    expect(new Set(all.map((e) => e.key)).size).toBe(all.length);
  });

  it("has English and Croatian text for every entry", () => {
    for (const e of all) {
      expect(e.text.en.trim(), e.key).not.toBe("");
      expect(e.text.hr.trim(), e.key).not.toBe("");
      expect(e.text.hr, e.key).not.toBe(e.text.en);
    }
  });

  it("gives every Chore a schedule and a believable Effort", () => {
    for (const c of LIBRARY_CHORES) {
      expect(c.schedule.kind === "every" ? c.schedule.days : c.schedule.days.length, c.key).toBeGreaterThan(0);
      expect(c.effort, c.key).toBeGreaterThanOrEqual(1);
      expect(c.effort, c.key).toBeLessThanOrEqual(120);
    }
  });

  it.each([
    ["kitchen", []],
    ["bathroom", ["shower", "toilet"]],
    ["toilet", []],
    ["bedroom", []],
    ["kids", []],
    ["living", []],
    ["hall", []],
    ["terrace", []],
    ["laundry", []],
  ] as const)("suggests at least three Chores for a %s", (type, fixtures) => {
    expect(choreKeysFor([{ id: "r", type, fixtures: [...fixtures] }], "r").length).toBeGreaterThanOrEqual(3);
  });

  it("suggests at least three Chores for the Whole home", () => {
    expect(choreKeysFor([], null).length).toBeGreaterThanOrEqual(3);
  });
});
