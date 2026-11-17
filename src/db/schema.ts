import { sql } from "drizzle-orm";
import { index, integer, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

export * from "./auth-schema";

/** The people who share one home and its Chores. */
export const households = pgTable("households", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const memberRole = pgEnum("member_role", ["owner", "member"]);

/** A person's place in a Household. A person belongs to one Household at a time (left_at is null while they belong). */
export const members = pgTable(
  "members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: memberRole("role").notNull(),
    joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
    leftAt: timestamp("left_at", { withTimezone: true }),
  },
  (t) => [
    index("members_household_idx").on(t.householdId),
    uniqueIndex("members_one_current_household").on(t.userId).where(sql`${t.leftAt} is null`),
  ],
);


export const roomType = pgEnum("room_type", [
  "kitchen", "living", "dining", "bedroom", "kids", "bathroom", "toilet", "hall", "laundry", "office", "storage", "terrace", "other",
]);

export const fixtureType = pgEnum("fixture_type", [
  "shower", "bathtub", "toilet", "sink", "oven", "hob", "fridge", "dishwasher", "washing_machine", "dryer", "counter", "window",
]);

/** One level of the home. A home always has at least one Floor. */
export const floors = pgTable(
  "floors",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id").notNull().references(() => households.id, { onDelete: "cascade" }),
    // Empty until the Owner names it; screens then show "Floor 1", "Floor 2" in the Member's language.
    name: text("name"),
    position: integer("position").notNull(),
  },
  (t) => [index("floors_household_idx").on(t.householdId)],
);

/** A named area of the home on a Floor. */
export const rooms = pgTable(
  "rooms",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id").notNull().references(() => households.id, { onDelete: "cascade" }),
    floorId: uuid("floor_id").notNull().references(() => floors.id, { onDelete: "cascade" }),
    type: roomType("type").notNull(),
    name: text("name").notNull(),
    position: integer("position").notNull(),
  },
  (t) => [index("rooms_floor_idx").on(t.floorId)],
);

/** A fixed thing in a Room that Chores attach to. */
export const fixtures = pgTable(
  "fixtures",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id").notNull().references(() => households.id, { onDelete: "cascade" }),
    roomId: uuid("room_id").notNull().references(() => rooms.id, { onDelete: "cascade" }),
    type: fixtureType("type").notNull(),
    position: integer("position").notNull(),
  },
  (t) => [index("fixtures_room_idx").on(t.roomId)],
);
