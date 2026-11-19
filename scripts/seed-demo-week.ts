/**
 * Demo only: gives the Omiš flat (made in the tutorial recording) a believable first week. Chores from the
 * starter library are added as of last Wednesday, and Pope and Nina take turns doing them each evening, with a few
 * left undone so Today has something overdue. Run with the app stopped (the local database allows one process).
 *
 *   DATABASE_URL=./.data/demo-omis5 npx tsx --tsconfig tsconfig.json scripts/seed-demo-week.ts
 */
import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db/client";
import { chores, fixtures, occurrences, rooms, user } from "@/db/schema";
import { addDays } from "@/domain/schedule";
import { addChore, completeOccurrence } from "@/server/chores";

const at = (day: string, time: string) => new Date(`${day}T${time}:00+01:00`);
const start = "2026-11-11";
const today = "2026-11-19";

async function main() {
  const db = getDb();
  const [pope] = await db.select().from(user).where(eq(user.email, "pope@omis.example"));
  const [nina] = await db.select().from(user).where(eq(user.email, "nina@omis.example"));
  const roomRows = await db.select().from(rooms);
  const fixtureRows = await db.select().from(fixtures);
  const room = (name: string) => roomRows.find((r) => r.name === name)!.id;
  const fixture = (roomName: string, type: string) => fixtureRows.find((f) => f.roomId === room(roomName) && f.type === type)!.id;

  type Plan = { name: string; at: { roomId?: string; fixtureId?: string }; every: number; effort: number; note?: string; skipFrom?: string };
  const plan: Plan[] = [
    { name: "Empty the dishwasher", at: { fixtureId: fixture("Living + kitchen", "dishwasher") }, every: 1, effort: 5 },
    { name: "Wipe the counters", at: { roomId: room("Living + kitchen") }, every: 1, effort: 5 },
    { name: "Clean the hob", at: { fixtureId: fixture("Living + kitchen", "hob") }, every: 3, effort: 10 },
    { name: "Throw out old food from the fridge", at: { fixtureId: fixture("Living + kitchen", "fridge") }, every: 7, effort: 10 },
    { name: "Mop the kitchen floor", at: { roomId: room("Living + kitchen") }, every: 7, effort: 15, note: "Tiles only, not the oak" },
    { name: "Vacuum the floor", at: { roomId: room("Hall") }, every: 7, effort: 15, note: "Empty the Roomba too" },
    { name: "Shake out the doormat", at: { roomId: room("Hall") }, every: 7, effort: 5 },
    { name: "Clean the toilet", at: { fixtureId: fixture("Bathroom", "toilet") }, every: 7, effort: 10 },
    { name: "Mop the bathroom floor", at: { roomId: room("Bathroom") }, every: 7, effort: 10, skipFrom: "2026-11-18" },
    { name: "Do a load of laundry", at: { fixtureId: fixture("Bathroom", "washing_machine") }, every: 3, effort: 10 },
    { name: "Change the towels", at: { roomId: room("Bathroom") }, every: 4, effort: 5 },
    { name: "Change the bed sheets", at: { roomId: room("Bedroom") }, every: 7, effort: 15 },
    { name: "Tidy the toys", at: { roomId: room("Children's room") }, every: 1, effort: 10 },
    { name: "Water the terrace plants", at: { roomId: room("Terrace") }, every: 2, effort: 10 },
    { name: "Sweep the terrace", at: { roomId: room("Terrace") }, every: 7, effort: 15, skipFrom: "2026-11-17" },
    { name: "Water the indoor plants", at: {}, every: 3, effort: 10 },
    { name: "Pay the bills", at: {}, every: 30, effort: 15 },
  ];

  const ids = new Map<string, Plan>();
  for (const [i, c] of plan.entries()) {
    const id = await addChore(db, i % 2 ? nina.id : pope.id, { name: c.name, ...c.at, effort: c.effort, note: c.note, schedule: { kind: "every", days: c.every } }, at(start, "10:00"));
    ids.set(id, c);
  }

  // The two chores made in the recording: the shower has waited since Tuesday; the bins had their Monday.
  const [shower] = await db.select().from(chores).where(eq(chores.name, "Clean the shower"));
  await db.update(occurrences).set({ dueOn: "2026-11-17" }).where(and(eq(occurrences.choreId, shower.id), isNull(occurrences.completedAt)));

  // Each evening, whatever is due gets done, Pope and Nina taking turns, except the ones they let slide.
  let turn = 0;
  for (let day = start; day < today; day = addDays(day, 1)) {
    const open = await db.select().from(occurrences).where(isNull(occurrences.completedAt));
    for (const o of open) {
      const c = ids.get(o.choreId);
      if (!c || o.dueOn > day || (c.skipFrom && day >= c.skipFrom)) continue;
      await completeOccurrence(db, turn++ % 2 ? nina.id : pope.id, o.id, at(day, turn % 2 ? "19:30" : "20:15"));
    }
  }
  console.log("seeded", plan.length, "chores, completions:", turn);
}

main().then(() => process.exit(0));
