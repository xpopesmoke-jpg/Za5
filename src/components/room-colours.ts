import type { RoomType } from "@/server/home-types";

/** Each kind of room keeps its own candy colour on the Home map and on its tile (a design token from globals.css). */
export const ROOM_TOKEN: Record<RoomType, string> = {
  kitchen: "--room-2", living: "--room-1", dining: "--room-2", bedroom: "--room-3", kids: "--room-4",
  bathroom: "--room-5", toilet: "--room-5", hall: "--room-2", laundry: "--room-5", office: "--room-1",
  storage: "--raised", terrace: "--terrace", other: "--raised",
};
