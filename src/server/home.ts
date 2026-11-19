import { and, asc, count, eq, inArray, max, type SQL } from "drizzle-orm";
import type { Db } from "@/db/client";
import { chores, fixtures, floors, households, rooms } from "@/db/schema";
import { FIXTURE_TYPES, ROOM_TYPES, type FixtureType, type RoomType } from "./home-types";
import { clockwise, signedArea2, type Outline } from "@/domain/layout";
import { FLOOR_NAME_MAX, ROOM_NAME_MAX } from "@/domain/limits";
import { NotAllowedError, NotFoundError, ValidationError } from "./errors";
import { getMyHousehold } from "./households";

export type { FixtureType, RoomType };

export type HomeFixture = { id: string; type: FixtureType };
export type HomeRoom = {
  id: string;
  type: RoomType;
  name: string;
  /** Corners on the Floor in centimetres, or null when the Room has no drawn outline yet */
  outline: Outline | null;
  fixtures: HomeFixture[];
};
export type HomeFloor = { id: string; name: string | null; rooms: HomeRoom[] };
export type Home = { householdId: string; canEdit: boolean; floors: HomeFloor[] };

async function householdOf(db: Db, userId: string) {
  const household = await getMyHousehold(db, userId);
  if (!household) throw new NotFoundError("Home");
  return household;
}

/** The home as its Members see it: Floors in order, each with its Rooms and their Fixtures. */
export async function getHome(db: Db, userId: string): Promise<Home> {
  const household = await householdOf(db, userId);
  const floorRows = await db.select().from(floors).where(eq(floors.householdId, household.id)).orderBy(asc(floors.position));
  const roomRows = await db.select().from(rooms).where(eq(rooms.householdId, household.id)).orderBy(asc(rooms.position));
  const fixtureRows = await db.select().from(fixtures).where(eq(fixtures.householdId, household.id)).orderBy(asc(fixtures.position));
  return {
    householdId: household.id,
    canEdit: household.role === "owner",
    floors: floorRows.map((f) => ({
      id: f.id,
      name: f.name,
      rooms: roomRows
        .filter((r) => r.floorId === f.id)
        .map((r) => ({
          id: r.id,
          type: r.type,
          name: r.name,
          outline: r.outline ?? null,
          fixtures: fixtureRows.filter((x) => x.roomId === r.id).map((x) => ({ id: x.id, type: x.type })),
        })),
    })),
  };
}

/** The Owner's Household; anyone else gets NotAllowedError, because only the Owner changes the home. */
async function ownersHousehold(db: Db, userId: string) {
  const household = await householdOf(db, userId);
  if (household.role !== "owner") throw new NotAllowedError("Only the owner can change the home.");
  return household;
}

async function floorOf(db: Db, householdId: string, floorId: string) {
  const [floor] = await db.select().from(floors).where(and(eq(floors.id, floorId), eq(floors.householdId, householdId)));
  if (!floor) throw new NotFoundError("Floor");
  return floor;
}

function shortName(typed: string, max: number) {
  const name = typed.trim();
  if (name.length > max) throw new ValidationError(`Keep the name under ${max} characters.`);
  return name;
}

function roomName(typed: string) {
  const name = shortName(typed, ROOM_NAME_MAX);
  if (!name) throw new ValidationError("Give the room a name.");
  return name;
}

function checkedRoomType(type: string): RoomType {
  if (!ROOM_TYPES.includes(type as RoomType)) throw new ValidationError("Pick a room type.");
  return type as RoomType;
}

/** Adds a Room at the end of a Floor. */
export async function addRoom(db: Db, userId: string, floorId: string, input: { type: RoomType; name: string }) {
  const household = await ownersHousehold(db, userId);
  const floor = await floorOf(db, household.id, floorId);
  const type = checkedRoomType(input.type);
  const name = roomName(input.name);
  const [{ last }] = await db.select({ last: max(rooms.position) }).from(rooms).where(eq(rooms.floorId, floor.id));
  const [room] = await db
    .insert(rooms)
    .values({ householdId: household.id, floorId: floor.id, type, name, position: (last ?? -1) + 1 })
    .returning({ id: rooms.id });
  return room.id;
}

async function roomOf(db: Db, householdId: string, roomId: string) {
  const [room] = await db.select().from(rooms).where(and(eq(rooms.id, roomId), eq(rooms.householdId, householdId)));
  if (!room) throw new NotFoundError("Room");
  return room;
}

/** Renames a Room and sets its type ("Room 3" → "Kids' room"). */
export async function renameRoom(db: Db, userId: string, roomId: string, input: { type: RoomType; name: string }) {
  const household = await ownersHousehold(db, userId);
  const room = await roomOf(db, household.id, roomId);
  const type = checkedRoomType(input.type);
  await db.update(rooms).set({ type, name: roomName(input.name) }).where(eq(rooms.id, room.id));
}

/** Removes a Room and its Fixtures. */
export async function removeRoom(db: Db, userId: string, roomId: string) {
  const household = await ownersHousehold(db, userId);
  const room = await roomOf(db, household.id, roomId);
  await db.transaction(async (tx) => {
    await moveChoresToNeedsRoom(tx, eq(chores.roomId, room.id));
    await tx.delete(rooms).where(eq(rooms.id, room.id));
  });
}

/**
 * Before Rooms go, their Chores keep their history and wait in "Needs a new room" (the Room link clears itself
 * when the Room is deleted).
 */
async function moveChoresToNeedsRoom(tx: Pick<Db, "update">, which: SQL | undefined) {
  await tx.update(chores).set({ needsRoom: true, fixtureId: null }).where(which);
}

/** Adds a Fixture at the end of a Room's list. */
export async function addFixture(db: Db, userId: string, roomId: string, type: FixtureType) {
  const household = await ownersHousehold(db, userId);
  const room = await roomOf(db, household.id, roomId);
  if (!FIXTURE_TYPES.includes(type)) throw new ValidationError("Pick a fixture.");
  const [{ last }] = await db.select({ last: max(fixtures.position) }).from(fixtures).where(eq(fixtures.roomId, room.id));
  const [fixture] = await db
    .insert(fixtures)
    .values({ householdId: household.id, roomId: room.id, type, position: (last ?? -1) + 1 })
    .returning({ id: fixtures.id });
  return fixture.id;
}

/** Removes one Fixture from its Room. */
export async function removeFixture(db: Db, userId: string, fixtureId: string) {
  const household = await ownersHousehold(db, userId);
  const deleted = await db
    .delete(fixtures)
    .where(and(eq(fixtures.id, fixtureId), eq(fixtures.householdId, household.id)))
    .returning({ id: fixtures.id });
  if (deleted.length === 0) throw new NotFoundError("Fixture");
}

/** Adds a Floor above the others. It has no name until the Owner gives it one. */
export async function addFloor(db: Db, userId: string) {
  const household = await ownersHousehold(db, userId);
  const [{ last }] = await db.select({ last: max(floors.position) }).from(floors).where(eq(floors.householdId, household.id));
  const [floor] = await db
    .insert(floors)
    .values({ householdId: household.id, position: (last ?? -1) + 1 })
    .returning({ id: floors.id });
  return floor.id;
}

/** Names a Floor ("Upstairs"); a blank name goes back to the numbered default. */
export async function renameFloor(db: Db, userId: string, floorId: string, typed: string) {
  const household = await ownersHousehold(db, userId);
  const floor = await floorOf(db, household.id, floorId);
  const name = shortName(typed, FLOOR_NAME_MAX);
  await db.update(floors).set({ name: name || null }).where(eq(floors.id, floor.id));
}

/** Removes a Floor with its Rooms. A home always keeps at least one Floor. */
export async function removeFloor(db: Db, userId: string, floorId: string) {
  const household = await ownersHousehold(db, userId);
  const floor = await floorOf(db, household.id, floorId);
  await db.transaction(async (tx) => {
    // Lock the household so two removals at once can't both see "more than one Floor left".
    await tx.select({ id: households.id }).from(households).where(eq(households.id, household.id)).for("update");
    const [{ n }] = await tx.select({ n: count() }).from(floors).where(eq(floors.householdId, household.id));
    if (n <= 1) throw new ValidationError("A home needs at least one floor.");
    await moveChoresToNeedsRoom(tx, inArray(chores.roomId, tx.select({ id: rooms.id }).from(rooms).where(eq(rooms.floorId, floor.id))));
    await tx.delete(floors).where(eq(floors.id, floor.id));
  });
}

/** Largest home side the outline accepts, in centimetres (a 100 m wide flat is not a flat). */
const OUTLINE_MAX_CM = 10_000;

/**
 * The Owner sets a Room's outline: its corners on the Floor in centimetres. Used by the Plan reader and the
 * "Fix it" editor later, and by the Omiš set-up script now. null clears it.
 */
export async function setRoomOutline(db: Db, userId: string, roomId: string, outline: Outline | null): Promise<void> {
  const household = await ownersHousehold(db, userId);
  const room = await roomOf(db, household.id, roomId);
  await db.update(rooms).set({ outline: outline === null ? null : checkedOutline(outline) }).where(eq(rooms.id, room.id));
}

/** A usable outline, stored clockwise: 3 to 64 corners within the home's size, enclosing some floor. */
function checkedOutline(outline: unknown): Outline {
  const bad = () => new ValidationError("That room outline doesn't look right.");
  if (!Array.isArray(outline) || outline.length < 3 || outline.length > 64) throw bad();
  for (const p of outline) {
    if (!Array.isArray(p) || p.length !== 2 || p.some((v) => typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > OUTLINE_MAX_CM)) throw bad();
  }
  const poly = outline as Outline;
  // at least 0.1 m² of floor, so a line or a dot isn't a room
  if (Math.abs(signedArea2(poly)) / 2 < 1_000) throw bad();
  return clockwise(poly);
}
