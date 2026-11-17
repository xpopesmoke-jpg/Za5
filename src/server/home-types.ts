import type { fixtureType, roomType } from "@/db/schema";

/** The kinds of Room and Fixture a home can have (safe to import from screens). */
export type RoomType = (typeof roomType.enumValues)[number];
export type FixtureType = (typeof fixtureType.enumValues)[number];

export const ROOM_TYPES: RoomType[] = ["kitchen", "living", "dining", "bedroom", "kids", "bathroom", "toilet", "hall", "laundry", "office", "storage", "terrace", "other"];
export const FIXTURE_TYPES: FixtureType[] = ["shower", "bathtub", "toilet", "sink", "oven", "hob", "fridge", "dishwasher", "washing_machine", "dryer", "counter", "window"];
