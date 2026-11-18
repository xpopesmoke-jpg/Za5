import type { Lang } from "@/i18n/config";
import type { FixtureType, RoomType } from "@/server/home-types";
import { LIBRARY_CHORES, LIBRARY_SUPPLIES } from "./library-data";

/** When a Chore comes round again: every N days counted from the last completion, or on fixed weekdays (1 = Monday). */
export type Schedule = { kind: "every"; days: number } | { kind: "weekdays"; days: number[] };

/**
 * Where a library entry belongs: the Whole home, or any Room that is one of `rooms` or has one of `fixtures`.
 * Matching on Fixtures lets a "Living + kitchen" with a hob still get the kitchen Chores.
 */
export type Where = "whole" | { rooms?: RoomType[]; fixtures?: FixtureType[] };

export type LibraryChore = {
  key: string;
  text: Record<Lang, string>;
  where: Where;
  schedule: Schedule;
  /** Effort in minutes */
  effort: number;
};

export type LibrarySupply = {
  key: string;
  text: Record<Lang, string>;
  where: Where;
};

/** What the suggester needs to know about a Room. */
export type HomeRoom = { id: string; type: RoomType; fixtures: FixtureType[] };

/** A suggestion's place: a Room's id, or null for the Whole home. */
export type Suggestion<T> = { roomId: string | null } & T;

function fits(where: Where, room: HomeRoom): boolean {
  if (where === "whole") return false;
  return (where.rooms?.includes(room.type) ?? false) || (where.fixtures?.some((f) => room.fixtures.includes(f)) ?? false);
}

/**
 * The starter Chores and Supplies for a home. Each fitting Room gets its own copy of a Chore (two bathrooms,
 * two "Clean the toilet"); a Supply is suggested once, in the first Room that fits, because one bottle of
 * bleach serves the home. Whole-home entries come with a null roomId.
 */
export function suggest(
  rooms: HomeRoom[],
  library: { chores: LibraryChore[]; supplies: LibrarySupply[] } = { chores: LIBRARY_CHORES, supplies: LIBRARY_SUPPLIES },
): { chores: Suggestion<{ chore: LibraryChore }>[]; supplies: Suggestion<{ supply: LibrarySupply }>[] } {
  const chores: Suggestion<{ chore: LibraryChore }>[] = [];
  for (const room of rooms) {
    for (const chore of library.chores) if (fits(chore.where, room)) chores.push({ roomId: room.id, chore });
  }
  for (const chore of library.chores) if (chore.where === "whole") chores.push({ roomId: null, chore });

  const supplies: Suggestion<{ supply: LibrarySupply }>[] = [];
  for (const supply of library.supplies) {
    if (supply.where === "whole") {
      supplies.push({ roomId: null, supply });
      continue;
    }
    const room = rooms.find((r) => fits(supply.where, r));
    if (room) supplies.push({ roomId: room.id, supply });
  }
  return { chores, supplies };
}
