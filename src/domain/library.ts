import type { Lang } from "@/i18n/config";
import type { FixtureType, RoomType } from "@/server/home-types";
import { LIBRARY_CHORES, LIBRARY_SUPPLIES } from "./library-data";
import type { Schedule } from "./schedule";

export type { Schedule };

/**
 * Where a starter-library entry belongs: the Whole home, or any Room that is one of `rooms` or has one of
 * `fixtures`, unless it has one of `notWith`. Matching on Fixtures lets a "Living + kitchen" with a hob get the
 * kitchen Chores; `notWith` keeps "Wash the dishes" away from a kitchen with a dishwasher.
 */
export type Placement = "whole" | { rooms?: RoomType[]; fixtures?: FixtureType[]; notWith?: FixtureType[] };

type LibraryEntry = {
  key: string;
  text: Record<Lang, string>;
  placement: Placement;
};

export type LibraryChore = LibraryEntry & {
  schedule: Schedule;
  /** Effort in minutes */
  effort: number;
};

export type LibrarySupply = LibraryEntry;

/** What the suggester needs to know about a Room. */
export type HomeRoom = { id: string; type: RoomType; fixtures: FixtureType[] };

export type ChoreSuggestion = {
  /** The Room it goes in, or null for the Whole home */
  roomId: string | null;
  /** The Fixture it belongs to, when a Fixture is what placed it there (Clean the shower → shower) */
  fixture: FixtureType | null;
  chore: LibraryChore;
};

export type SupplySuggestion = { roomId: string | null; supply: LibrarySupply };

/** How an entry fits a Room: not at all, by the Room's type, or by one of its Fixtures. */
function fit(placement: Placement, room: HomeRoom): { fixture: FixtureType | null } | null {
  if (placement === "whole") return null;
  if (placement.notWith?.some((f) => room.fixtures.includes(f))) return null;
  if (placement.rooms?.includes(room.type)) return { fixture: null };
  const fixture = placement.fixtures?.find((f) => room.fixtures.includes(f));
  return fixture ? { fixture } : null;
}

/**
 * The starter Chores and Supplies for a home. Each fitting Room gets its own copy of a Chore (two bathrooms,
 * two "Clean the toilet"); a Supply is suggested once, in the first Room that fits, because one bottle of
 * bleach serves the home. Whole-home entries come with a null roomId.
 */
export function suggest(
  rooms: HomeRoom[],
  library: { chores: LibraryChore[]; supplies: LibrarySupply[] } = { chores: LIBRARY_CHORES, supplies: LIBRARY_SUPPLIES },
): { chores: ChoreSuggestion[]; supplies: SupplySuggestion[] } {
  const chores: ChoreSuggestion[] = [];
  for (const room of rooms) {
    for (const chore of library.chores) {
      const f = fit(chore.placement, room);
      if (f) chores.push({ roomId: room.id, fixture: f.fixture, chore });
    }
  }
  for (const chore of library.chores) if (chore.placement === "whole") chores.push({ roomId: null, fixture: null, chore });

  const supplies: SupplySuggestion[] = [];
  for (const supply of library.supplies) {
    if (supply.placement === "whole") {
      supplies.push({ roomId: null, supply });
      continue;
    }
    const room = rooms.find((r) => fit(supply.placement, r));
    if (room) supplies.push({ roomId: room.id, supply });
  }
  return { chores, supplies };
}
