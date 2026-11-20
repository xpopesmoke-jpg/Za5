import type { Db } from "@/db/client";
import { mapFloor, type MapFloor, type MapRoom } from "@/domain/map";
import { getToday, type TodayItem } from "./chores";
import { getHome } from "./home";

export type { MapFloor, MapRoom };

export type HomeMap = {
  floors: MapFloor[];
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
      const drawn = mapFloor(floor);
      return { ...drawn, rooms: drawn.rooms.map((r) => ({ ...r, ...counts(today.filter((i) => i.roomId === r.id)) })) };
    }),
    wholeHome: counts(today.filter((i) => i.roomId === null && !i.needsRoom)),
  };
}
