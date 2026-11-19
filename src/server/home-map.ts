import type { Db } from "@/db/client";
import { layoutFloor } from "@/domain/layout";
import { getToday, type TodayItem } from "./chores";
import type { FixtureType, RoomType } from "./home-types";
import { getHome } from "./home";

export type MapRoom = {
  id: string;
  name: string;
  type: RoomType;
  /** Corners in centimetres on the Floor */
  polygon: [number, number][];
  /** False when the Room has no outline yet and was laid out by Za5 */
  drawn: boolean;
  fixtures: FixtureType[];
  /** Occurrences on Today's list for this Room (put-off ones not counted) */
  due: number;
  /** Of those, the overdue ones: the Room glows */
  overdue: number;
};

export type HomeMap = {
  floors: { id: string; name: string | null; rooms: MapRoom[] }[];
  /** Today's Whole home Chores, for the badge on the home */
  wholeHome: { due: number; overdue: number };
};

const counts = (items: TodayItem[]) => {
  const live = items.filter((i) => !i.postponedUntil);
  return { due: live.length, overdue: live.filter((i) => i.overdueDays > 0).length };
};

/** Everything the 3D Home map draws: each Floor's Rooms in place, and what waits in each one today. */
export async function getHomeMap(db: Db, userId: string, now: Date): Promise<HomeMap> {
  const [home, today] = await Promise.all([getHome(db, userId), getToday(db, userId, now)]);
  return {
    floors: home.floors.map((floor) => {
      const laid = new Map(layoutFloor(floor.rooms.map((r) => ({ id: r.id, type: r.type, outline: r.outline }))).rooms.map((r) => [r.id, r]));
      return {
        id: floor.id,
        name: floor.name,
        rooms: floor.rooms.map((r) => ({
          id: r.id,
          name: r.name,
          type: r.type,
          polygon: laid.get(r.id)!.polygon,
          drawn: laid.get(r.id)!.drawn,
          fixtures: r.fixtures.map((f) => f.type),
          ...counts(today.filter((i) => i.roomId === r.id)),
        })),
      };
    }),
    wholeHome: counts(today.filter((i) => i.roomId === null && !i.needsRoom)),
  };
}
