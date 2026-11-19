import { and, asc, eq, isNull } from "drizzle-orm";
import type { Db } from "@/db/client";
import { chores } from "@/db/schema";
import { suggest, type HomeRoom, type LibraryChore } from "@/domain/library";
import type { Lang } from "@/i18n/config";
import { addChore } from "./chores";
import { NotAllowedError, NotFoundError } from "./errors";
import type { FixtureType } from "./home-types";
import { getHome } from "./home";

/** One stop on the walkthrough: a Room, or the Whole home at the end. */
export type SetupStep = { kind: "room"; roomId: string; name: string } | { kind: "whole" };

export type SetupSuggestion = { key: string; name: string; everyDays: number; effort: number; fixtureType: FixtureType | null };
export type SetupAdded = { choreId: string; name: string; everyDays: number | null; effort: number };

/** What the Owner chose on one step: suggestions to keep (with any changes), and Chores the library missed. */
export type SetupChoices = {
  keep: { key: string; everyDays?: number; effort?: number; note?: string | null }[];
  extra: { name: string; everyDays: number; effort: number; note?: string | null }[];
};

/** Every Room, floor by floor in the home's order, then the Whole home. */
export async function getSetupSteps(db: Db, userId: string): Promise<SetupStep[]> {
  const home = await getHome(db, userId);
  return [...home.floors.flatMap((f) => f.rooms.map((r): SetupStep => ({ kind: "room", roomId: r.id, name: r.name }))), { kind: "whole" }];
}

/** The Room as the starter library sees it (type and Fixtures), with its Fixtures' ids; null for the Whole home. */
async function placeOf(db: Db, userId: string, roomId: string | null) {
  const home = await getHome(db, userId);
  if (roomId === null) return { home, room: null };
  const room = home.floors.flatMap((f) => f.rooms).find((r) => r.id === roomId);
  if (!room) throw new NotFoundError("Room");
  return { home, room };
}

function libraryFor(room: { id: string; type: HomeRoom["type"]; fixtures: { type: FixtureType }[] } | null) {
  if (!room) return suggest([]).chores.filter((s) => s.roomId === null);
  return suggest([{ id: room.id, type: room.type, fixtures: room.fixtures.map((f) => f.type) }]).chores.filter((s) => s.roomId === room.id);
}

/**
 * How many days after setup a kept Chore is first due: daily ones today, the rest spread over their own
 * interval by a fixed hash of the library key, so a new home isn't every chore on day one (and the same chore
 * always lands the same way).
 */
export function firstDueOffset(key: string, everyDays: number): number {
  if (everyDays <= 1) return 0;
  let h = 0;
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h % everyDays;
}

const everyDaysOf = (c: LibraryChore) => (c.schedule.kind === "every" ? c.schedule.days : 7);

async function choresAt(db: Db, householdId: string, roomId: string | null) {
  return db
    .select()
    .from(chores)
    .where(and(eq(chores.householdId, householdId), roomId ? eq(chores.roomId, roomId) : and(isNull(chores.roomId), eq(chores.needsRoom, false))))
    .orderBy(asc(chores.createdAt));
}

/** One Room's (or the Whole home's) step: what is there already, and the suggestions not yet taken. */
export async function getSetupStep(db: Db, userId: string, roomId: string | null, lang: Lang): Promise<{ suggestions: SetupSuggestion[]; added: SetupAdded[] }> {
  const { home, room } = await placeOf(db, userId, roomId);
  const existing = await choresAt(db, home.householdId, roomId);
  const taken = new Set(existing.map((c) => c.libraryKey).filter(Boolean));
  return {
    added: existing.map((c) => ({ choreId: c.id, name: c.name, everyDays: c.everyDays, effort: c.effort })),
    suggestions: libraryFor(room)
      .filter((s) => !taken.has(s.chore.key))
      .map((s) => ({ key: s.chore.key, name: s.chore.text[lang], everyDays: everyDaysOf(s.chore), effort: s.chore.effort, fixtureType: s.fixture })),
  };
}

/**
 * Saves one step: each kept suggestion becomes a Chore with its defaults (or the Owner's changes), at its
 * Fixture when a Fixture placed it, named in the Owner's language; extra Chores go in the same Room. Keys that
 * aren't suggestions for this Room, or are already there, are ignored, so saving twice adds nothing twice.
 */
export async function saveSetupStep(db: Db, userId: string, roomId: string | null, choices: SetupChoices, lang: Lang, now: Date): Promise<{ added: number }> {
  const { home, room } = await placeOf(db, userId, roomId);
  if (!home.canEdit) throw new NotAllowedError("Only the owner can set up chores room by room.");
  const taken = new Set((await choresAt(db, home.householdId, roomId)).map((c) => c.libraryKey).filter(Boolean));
  const offered = new Map(libraryFor(room).map((s) => [s.chore.key, s]));
  const place = (fixture: FixtureType | null) => {
    const fixtureId = fixture ? room?.fixtures.find((f) => f.type === fixture)?.id : undefined;
    return fixtureId ? { fixtureId } : room ? { roomId: room.id } : {};
  };
  let added = 0;
  for (const k of choices.keep) {
    const s = offered.get(k.key);
    if (!s || taken.has(k.key)) continue;
    taken.add(k.key);
    const everyDays = k.everyDays ?? everyDaysOf(s.chore);
    const startAt = new Date(now.getTime() + firstDueOffset(s.chore.key, everyDays) * 86_400_000);
    await addChore(
      db,
      userId,
      {
        name: s.chore.text[lang],
        note: k.note,
        effort: k.effort ?? s.chore.effort,
        schedule: { kind: "every", days: everyDays },
        libraryKey: s.chore.key,
        ...place(s.fixture),
      },
      startAt,
    );
    added++;
  }
  for (const e of choices.extra) {
    if (!e.name.trim()) continue;
    await addChore(db, userId, { name: e.name, note: e.note, effort: e.effort, schedule: { kind: "every", days: e.everyDays }, ...place(null) }, now);
    added++;
  }
  return { added };
}
