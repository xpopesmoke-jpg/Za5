import { beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "@/db/setup";
import type { Db } from "@/db/client";
import { addMember, makeUser } from "@/test/helpers";
import { createHousehold } from "./households";
import { addFloor, addRoom, getHome, setRoomOutline } from "./home";
import { addChore } from "./chores";
import { getHomeMap } from "./home-map";
import { NotAllowedError, ValidationError } from "./errors";

const at = (local: string) => new Date(local.replace(" ", "T") + ":00+01:00");
const weekly = { kind: "every", days: 7 } as const;

let db: Db;
let pope: string;
let homeId: string;
let ground: string;
let bath: string;
let bed: string;

beforeEach(async () => {
  db = await createTestDb();
  pope = await makeUser(db, "Pope");
  homeId = (await createHousehold(db, pope, "Omiš flat")).id;
  ground = (await getHome(db, pope)).floors[0].id;
  bath = await addRoom(db, pope, ground, { type: "bathroom", name: "Bathroom" });
  bed = await addRoom(db, pope, ground, { type: "bedroom", name: "Bedroom" });
});

const roomOf = async (id: string, when = "2026-11-19 10:00") => (await getHomeMap(db, pope, at(when))).floors[0].rooms.find((r) => r.id === id)!;

describe("the Home map", () => {
  it("shows each Floor's Rooms in place, with their names, types and Fixtures", async () => {
    const map = await getHomeMap(db, pope, at("2026-11-19 10:00"));

    expect(map.floors).toHaveLength(1);
    expect(map.floors[0].rooms.map((r) => [r.name, r.type, r.polygon.length])).toEqual([
      ["Bathroom", "bathroom", 4],
      ["Bedroom", "bedroom", 4],
    ]);
  });

  it("counts what is due and what is overdue in each Room, and in the Whole home", async () => {
    await addChore(db, pope, { name: "Clean the shower", roomId: bath, effort: 15, schedule: weekly }, at("2026-11-16 08:00"));
    await addChore(db, pope, { name: "Wipe the mirror", roomId: bath, effort: 5, schedule: weekly }, at("2026-11-19 08:00"));
    await addChore(db, pope, { name: "Pay the bills", effort: 15, schedule: weekly }, at("2026-11-19 08:00"));

    const map = await getHomeMap(db, pope, at("2026-11-19 10:00"));
    const room = (id: string) => map.floors[0].rooms.find((r) => r.id === id)!;

    expect([room(bath).due, room(bath).overdue]).toEqual([2, 1]);
    expect([room(bed).due, room(bed).overdue]).toEqual([0, 0]);
    expect(map.wholeHome).toEqual({ due: 1, overdue: 0 });
  });

  it("uses a Room's drawn outline when it has one", async () => {
    const outline: [number, number][] = [
      [724, 0],
      [893, 0],
      [893, 260],
      [741, 260],
    ];
    await setRoomOutline(db, pope, bath, outline);

    expect(await roomOf(bath)).toMatchObject({ polygon: outline, drawn: true });
    expect((await roomOf(bed)).drawn).toBe(false);
  });

  it("lists every Floor for the switcher, each with its own Rooms", async () => {
    const upstairs = await addFloor(db, pope);
    await addRoom(db, pope, upstairs, { type: "kids", name: "Kids" });

    const map = await getHomeMap(db, pope, at("2026-11-19 10:00"));
    expect(map.floors.map((f) => f.rooms.map((r) => r.name))).toEqual([["Bathroom", "Bedroom"], ["Kids"]]);
  });
});

describe("setting an outline", () => {
  it("is for the Owner only, and refuses nonsense", async () => {
    const nina = await makeUser(db, "Nina");
    await addMember(db, homeId, nina);
    const square: [number, number][] = [
      [0, 0],
      [100, 0],
      [100, 100],
    ];

    await expect(setRoomOutline(db, nina, bath, square)).rejects.toThrow(NotAllowedError);
    await expect(setRoomOutline(db, pope, bath, [[0, 0], [1e9, 0], [5, 5]])).rejects.toThrow(ValidationError);
  });
});
