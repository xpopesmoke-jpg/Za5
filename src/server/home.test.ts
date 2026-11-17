import { beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "@/db/setup";
import type { Db } from "@/db/client";
import { addMember, makeUser } from "@/test/helpers";
import { NotAllowedError, NotFoundError, ValidationError } from "./errors";
import { createHousehold, getMyHousehold } from "./households";
import { addFixture, addFloor, addRoom, getHome, removeFixture, removeFloor, removeRoom, renameFloor, renameRoom } from "./home";

let db: Db;
let pope: string;

beforeEach(async () => {
  db = await createTestDb();
  pope = await makeUser(db, "Pope");
  await createHousehold(db, pope, "Omiš flat");
});

describe("building the home from a room list", () => {
  it("starts with one empty Floor", async () => {
    const home = await getHome(db, pope);

    expect(home.floors).toHaveLength(1);
    expect(home.floors[0].rooms).toEqual([]);
  });

  it("lets the Owner add Rooms to a Floor in order", async () => {
    const [floor] = (await getHome(db, pope)).floors;

    await addRoom(db, pope, floor.id, { type: "kitchen", name: "Kitchen" });
    await addRoom(db, pope, floor.id, { type: "bathroom", name: "Bathroom" });

    const rooms = (await getHome(db, pope)).floors[0].rooms;
    expect(rooms.map((r) => [r.type, r.name])).toEqual([["kitchen", "Kitchen"], ["bathroom", "Bathroom"]]);
  });

  it("shows the home to Members but lets only the Owner change it", async () => {
    const ana = await makeUser(db, "Ana");
    await addMember(db, (await getMyHousehold(db, pope))!.id, ana);
    const [floor] = (await getHome(db, ana)).floors;

    await expect(addRoom(db, ana, floor.id, { type: "kitchen", name: "Kitchen" })).rejects.toThrow(NotAllowedError);
    expect((await getHome(db, ana)).canEdit).toBe(false);
    expect((await getHome(db, pope)).canEdit).toBe(true);
  });

  it("never touches another household's Floor", async () => {
    const luka = await makeUser(db, "Luka");
    await createHousehold(db, luka, "Split house");
    const [lukasFloor] = (await getHome(db, luka)).floors;

    await expect(addRoom(db, pope, lukasFloor.id, { type: "kitchen", name: "Kitchen" })).rejects.toThrow(NotFoundError);
    expect((await getHome(db, luka)).floors[0].rooms).toEqual([]);
  });

  it("needs a Room name, trimmed, of at most 40 characters", async () => {
    const [floor] = (await getHome(db, pope)).floors;

    await expect(addRoom(db, pope, floor.id, { type: "kitchen", name: "  " })).rejects.toThrow(ValidationError);
    await expect(addRoom(db, pope, floor.id, { type: "kitchen", name: "x".repeat(41) })).rejects.toThrow(ValidationError);
    await addRoom(db, pope, floor.id, { type: "kitchen", name: "  Kitchen " });
    expect((await getHome(db, pope)).floors[0].rooms[0].name).toBe("Kitchen");
  });

  it("lets the Owner rename a Room and change its type", async () => {
    const [floor] = (await getHome(db, pope)).floors;
    const room = await addRoom(db, pope, floor.id, { type: "other", name: "Room 3" });

    await renameRoom(db, pope, room, { type: "kids", name: "Kids' room" });

    expect((await getHome(db, pope)).floors[0].rooms[0]).toMatchObject({ type: "kids", name: "Kids' room" });
  });

  it("removes a Room together with its Fixtures", async () => {
    const [floor] = (await getHome(db, pope)).floors;
    const bath = await addRoom(db, pope, floor.id, { type: "bathroom", name: "Bathroom" });
    await addRoom(db, pope, floor.id, { type: "kitchen", name: "Kitchen" });
    await addFixture(db, pope, bath, "shower");

    await removeRoom(db, pope, bath);

    expect((await getHome(db, pope)).floors[0].rooms.map((r) => r.name)).toEqual(["Kitchen"]);
  });
});

describe("Fixtures", () => {
  it("lets the Owner add Fixtures to a Room in order", async () => {
    const [floor] = (await getHome(db, pope)).floors;
    const bath = await addRoom(db, pope, floor.id, { type: "bathroom", name: "Bathroom" });

    await addFixture(db, pope, bath, "shower");
    await addFixture(db, pope, bath, "toilet");

    expect((await getHome(db, pope)).floors[0].rooms[0].fixtures.map((f) => f.type)).toEqual(["shower", "toilet"]);
  });

  it("lets the Owner remove a Fixture, and never one from another household", async () => {
    const [floor] = (await getHome(db, pope)).floors;
    const bath = await addRoom(db, pope, floor.id, { type: "bathroom", name: "Bathroom" });
    const shower = await addFixture(db, pope, bath, "shower");
    await addFixture(db, pope, bath, "toilet");
    const luka = await makeUser(db, "Luka");
    await createHousehold(db, luka, "Split house");

    await expect(removeFixture(db, luka, shower)).rejects.toThrow(NotFoundError);
    await removeFixture(db, pope, shower);

    expect((await getHome(db, pope)).floors[0].rooms[0].fixtures.map((f) => f.type)).toEqual(["toilet"]);
  });
});

describe("Floors", () => {
  it("lets the Owner add a Floor after the others and name it", async () => {
    const upstairs = await addFloor(db, pope);
    await renameFloor(db, pope, upstairs, "  Upstairs ");

    const home = await getHome(db, pope);
    expect(home.floors.map((f) => f.name)).toEqual([null, "Upstairs"]);
  });

  it("removes a Floor with its Rooms, but never the last one", async () => {
    const [ground] = (await getHome(db, pope)).floors;
    const upstairs = await addFloor(db, pope);
    await addRoom(db, pope, upstairs, { type: "bedroom", name: "Bedroom" });

    await removeFloor(db, pope, upstairs);
    expect((await getHome(db, pope)).floors.map((f) => f.id)).toEqual([ground.id]);

    await expect(removeFloor(db, pope, ground.id)).rejects.toThrow(ValidationError);
  });
});

describe("guards on every change", () => {
  it("refuses every change from a Member and from another household", async () => {
    const [floor] = (await getHome(db, pope)).floors;
    const bath = await addRoom(db, pope, floor.id, { type: "bathroom", name: "Bathroom" });
    const shower = await addFixture(db, pope, bath, "shower");
    const upstairs = await addFloor(db, pope);
    const ana = await makeUser(db, "Ana");
    await addMember(db, (await getMyHousehold(db, pope))!.id, ana);
    const luka = await makeUser(db, "Luka");
    await createHousehold(db, luka, "Split house");

    const changes = (who: string) => [
      () => addRoom(db, who, floor.id, { type: "kitchen", name: "Kitchen" }),
      () => renameRoom(db, who, bath, { type: "toilet", name: "WC" }),
      () => removeRoom(db, who, bath),
      () => addFixture(db, who, bath, "bathtub"),
      () => removeFixture(db, who, shower),
      () => renameFloor(db, who, upstairs, "Attic"),
      () => removeFloor(db, who, upstairs),
    ];
    for (const run of changes(ana)) await expect(run()).rejects.toThrow(NotAllowedError);
    await expect(addFloor(db, ana)).rejects.toThrow(NotAllowedError);
    for (const run of changes(luka)) await expect(run()).rejects.toThrow(NotFoundError);

    const home = await getHome(db, pope);
    expect(home.floors).toHaveLength(2);
    expect(home.floors[0].rooms).toMatchObject([{ name: "Bathroom", fixtures: [{ type: "shower" }] }]);
  });

  it("refuses a Room type or Floor name that doesn't fit", async () => {
    const [floor] = (await getHome(db, pope)).floors;

    await expect(addRoom(db, pope, floor.id, { type: "garage" as never, name: "Garage" })).rejects.toThrow(ValidationError);
    await expect(renameFloor(db, pope, floor.id, "x".repeat(41))).rejects.toThrow(ValidationError);
  });

  it("keeps one Floor when two removals race", async () => {
    const upstairs = await addFloor(db, pope);
    const [ground] = (await getHome(db, pope)).floors;

    await Promise.allSettled([removeFloor(db, pope, ground.id), removeFloor(db, pope, upstairs)]);

    expect((await getHome(db, pope)).floors).toHaveLength(1);
  });
});
