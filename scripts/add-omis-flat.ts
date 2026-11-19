/**
 * Puts the Omiš flat (rooms and fixtures from the carpenter's plan, and its chores) into one person's home.
 * Safe to run twice: rooms, fixtures and chores that are already there are left alone.
 *
 *   npx tsx scripts/add-omis-flat.ts someone@example.com
 *
 * The person must have signed up already. If they have no home yet, one called "Omiš flat" is made for them.
 * Uses DATABASE_URL, like the app.
 */
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { chores, user } from "@/db/schema";
import type { Schedule } from "@/domain/schedule";
import { addChore } from "@/server/chores";
import type { FixtureType, RoomType } from "@/server/home-types";
import { addFixture, addRoom, getHome } from "@/server/home";
import { createHousehold, getMyHousehold } from "@/server/households";

const ROOMS: { name: string; type: RoomType; fixtures: FixtureType[] }[] = [
  { name: "Living + kitchen", type: "living", fixtures: ["hob", "oven", "fridge", "dishwasher"] },
  { name: "Hall", type: "hall", fixtures: [] },
  { name: "Bathroom", type: "bathroom", fixtures: ["shower", "toilet", "washing_machine"] },
  { name: "Bedroom", type: "bedroom", fixtures: [] },
  { name: "Children's room", type: "kids", fixtures: [] },
  { name: "Terrace", type: "terrace", fixtures: [] },
];

type Place = { room?: string; fixture?: FixtureType };
const every = (days: number): Schedule => ({ kind: "every", days });
const CHORES: { name: string; at: Place; schedule: Schedule; effort: number; note?: string }[] = [
  { name: "Clean the shower", at: { room: "Bathroom", fixture: "shower" }, schedule: every(7), effort: 15, note: "Limescale spray on the glass, then squeegee" },
  { name: "Take out the bins", at: { room: "Living + kitchen" }, schedule: { kind: "weekdays", days: [1, 4] }, effort: 5 },
  { name: "Empty the dishwasher", at: { room: "Living + kitchen", fixture: "dishwasher" }, schedule: every(1), effort: 5 },
  { name: "Wipe the counters", at: { room: "Living + kitchen" }, schedule: every(1), effort: 5 },
  { name: "Clean the hob", at: { room: "Living + kitchen", fixture: "hob" }, schedule: every(3), effort: 10 },
  { name: "Throw out old food from the fridge", at: { room: "Living + kitchen", fixture: "fridge" }, schedule: every(7), effort: 10 },
  { name: "Mop the kitchen floor", at: { room: "Living + kitchen" }, schedule: every(7), effort: 15, note: "Tiles only, not the oak" },
  { name: "Vacuum the floor", at: { room: "Hall" }, schedule: every(7), effort: 15, note: "Empty the Roomba too" },
  { name: "Shake out the doormat", at: { room: "Hall" }, schedule: every(7), effort: 5 },
  { name: "Clean the toilet", at: { room: "Bathroom", fixture: "toilet" }, schedule: every(7), effort: 10 },
  { name: "Mop the bathroom floor", at: { room: "Bathroom" }, schedule: every(7), effort: 10 },
  { name: "Do a load of laundry", at: { room: "Bathroom", fixture: "washing_machine" }, schedule: every(3), effort: 10 },
  { name: "Change the towels", at: { room: "Bathroom" }, schedule: every(4), effort: 5 },
  { name: "Change the bed sheets", at: { room: "Bedroom" }, schedule: every(7), effort: 15 },
  { name: "Tidy the toys", at: { room: "Children's room" }, schedule: every(1), effort: 10 },
  { name: "Water the terrace plants", at: { room: "Terrace" }, schedule: every(2), effort: 10 },
  { name: "Sweep the terrace", at: { room: "Terrace" }, schedule: every(7), effort: 15 },
  { name: "Water the indoor plants", at: {}, schedule: every(3), effort: 10 },
  { name: "Pay the bills", at: {}, schedule: every(30), effort: 15 },
];

export async function addOmisFlat(email: string, now = new Date()) {
  const db = getDb();
  const [person] = await db.select().from(user).where(eq(user.email, email.trim().toLowerCase()));
  if (!person) throw new Error(`No account for ${email}. Sign up in the app first, then run this again.`);

  let household = await getMyHousehold(db, person.id);
  if (!household) {
    await createHousehold(db, person.id, "Omiš flat");
    household = (await getMyHousehold(db, person.id))!;
  }
  if (household.role !== "owner") throw new Error(`${email} is a member of "${household.name}", not its owner. Run this for the owner.`);

  const floorId = (await getHome(db, person.id)).floors[0].id;
  const findRoom = async (name: string) => (await getHome(db, person.id)).floors.flatMap((f) => f.rooms).find((r) => r.name === name);
  let roomsAdded = 0;
  let fixturesAdded = 0;
  for (const r of ROOMS) {
    if (!(await findRoom(r.name))) {
      await addRoom(db, person.id, floorId, { type: r.type, name: r.name });
      roomsAdded++;
    }
    const room = (await findRoom(r.name))!;
    for (const f of r.fixtures) {
      if (!room.fixtures.some((x) => x.type === f)) {
        await addFixture(db, person.id, room.id, f);
        fixturesAdded++;
      }
    }
  }

  const existing = new Set((await db.select({ name: chores.name }).from(chores).where(eq(chores.householdId, household.id))).map((c) => c.name));
  let choresAdded = 0;
  // Spread the first due days, so a new home is not 19 chores on day one: daily ones start today, the rest
  // fall on different days within their own interval.
  let spread = 0;
  for (const c of CHORES) {
    if (existing.has(c.name)) continue;
    const offsetDays = c.schedule.kind === "every" && c.schedule.days > 1 ? spread++ % c.schedule.days : 0;
    const startAt = new Date(now.getTime() + offsetDays * 86_400_000);
    const room = c.at.room ? (await findRoom(c.at.room))! : undefined;
    const fixtureId = c.at.fixture ? room!.fixtures.find((f) => f.type === c.at.fixture)!.id : undefined;
    await addChore(db, person.id, { name: c.name, note: c.note, effort: c.effort, schedule: c.schedule, ...(fixtureId ? { fixtureId } : room ? { roomId: room.id } : {}) }, startAt);
    choresAdded++;
  }
  return { home: household.name, roomsAdded, fixturesAdded, choresAdded };
}

const email = process.argv[2];
if (!email) {
  console.error("Usage: npx tsx scripts/add-omis-flat.ts someone@example.com");
  process.exit(1);
}
addOmisFlat(email)
  .then((r) => {
    console.log(`Done: "${r.home}" got ${r.roomsAdded} rooms, ${r.fixturesAdded} fixtures and ${r.choresAdded} chores.`);
    process.exit(0);
  })
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
