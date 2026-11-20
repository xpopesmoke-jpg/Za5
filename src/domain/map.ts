import type { FixtureType, RoomType } from "@/server/home-types";
import { layoutFloor, type Outline } from "./layout";
import type { DraftOpening } from "./plan";

/** A Room as the 3D Home map draws it. */
export type MapRoom = {
  id: string;
  name: string;
  type: RoomType;
  /** Corners in centimetres on the Floor */
  polygon: Outline;
  /** False when the Room has no outline yet and was laid out by Za5 */
  drawn: boolean;
  /** Fixtures, with their place on the Floor when the Plan showed it */
  fixtures: { type: FixtureType; at: [number, number] | null }[];
  /** Occurrences on Today's list for this Room (put-off ones not counted) */
  due: number;
  /** Of those, the overdue ones: the Room glows */
  overdue: number;
};

export type MapFloor = { id: string; name: string | null; rooms: MapRoom[]; openings: DraftOpening[] };

type FloorIn = {
  id: string;
  name: string | null;
  openings: DraftOpening[];
  rooms: { id: string; name: string; type: RoomType; outline: Outline | null; fixtures: { type: FixtureType; at: [number, number] | null }[] }[];
};

/** A Floor ready to draw: Rooms without an outline get one from the automatic layout; counts start at 0. */
export function mapFloor(floor: FloorIn): MapFloor {
  const laid = new Map(layoutFloor(floor.rooms.map((r) => ({ id: r.id, type: r.type, outline: r.outline }))).rooms.map((r) => [r.id, r]));
  return {
    id: floor.id,
    name: floor.name,
    openings: floor.openings,
    rooms: floor.rooms.map((r) => ({
      id: r.id,
      name: r.name,
      type: r.type,
      polygon: laid.get(r.id)!.polygon,
      drawn: laid.get(r.id)!.drawn,
      fixtures: r.fixtures.map((f) => ({ type: f.type, at: f.at })),
      due: 0,
      overdue: 0,
    })),
  };
}
