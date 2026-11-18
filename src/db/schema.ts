import { sql } from "drizzle-orm";
import { boolean, check, date, index, integer, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

export * from "./auth-schema";

/** The people who share one home and its Chores. */
export const households = pgTable("households", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  // "Today" and due days are counted in the home's own time zone.
  timeZone: text("time_zone").notNull().default("Europe/Zagreb"),
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

export const scheduleKind = pgEnum("schedule_kind", ["every", "weekdays"]);

/**
 * A repeating job in the home. It sits in a Room, at a Fixture in that Room, or in the Whole home (no Room).
 * When its Room is removed it keeps its history and waits in "Needs a new room" (needs_room).
 */
export const chores = pgTable(
  "chores",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id").notNull().references(() => households.id, { onDelete: "cascade" }),
    roomId: uuid("room_id").references(() => rooms.id, { onDelete: "set null" }),
    fixtureId: uuid("fixture_id").references(() => fixtures.id, { onDelete: "set null" }),
    needsRoom: boolean("needs_room").notNull().default(false),
    name: text("name").notNull(),
    note: text("note"),
    effort: integer("effort").notNull(),
    scheduleKind: scheduleKind("schedule_kind").notNull(),
    // every: days counted from the last completion; weekdays: 1 = Monday … 7 = Sunday
    everyDays: integer("every_days"),
    weekdays: integer("weekdays").array(),
    createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("chores_household_idx").on(t.householdId),
    check(
      "chores_schedule_shape",
      sql`(${t.scheduleKind} = 'every' and ${t.everyDays} > 0 and ${t.weekdays} is null) or (${t.scheduleKind} = 'weekdays' and ${t.everyDays} is null and cardinality(${t.weekdays}) > 0 and ${t.weekdays} <@ array[1,2,3,4,5,6,7])`,
    ),
  ],
);

/** One due instance of a Chore. A Chore has at most one open Occurrence; completed ones are its history. */
export const occurrences = pgTable(
  "occurrences",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id").notNull().references(() => households.id, { onDelete: "cascade" }),
    choreId: uuid("chore_id").notNull().references(() => chores.id, { onDelete: "cascade" }),
    dueOn: date("due_on", { mode: "string" }).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    // Kept even if the account goes, so history stays readable; Effort is copied in as it was when done.
    completedBy: text("completed_by").references(() => user.id, { onDelete: "set null" }),
    effort: integer("effort"),
    // A Claim: who took it, and the last day it holds (the due day, or the day it was claimed if that is later).
    claimedBy: text("claimed_by").references(() => user.id, { onDelete: "set null" }),
    claimedUntil: date("claimed_until", { mode: "string" }),
    // When the claimer saw "Ana did this for you" and put it away.
    claimNoteSeenAt: timestamp("claim_note_seen_at", { withTimezone: true }),
  },
  (t) => [
    index("occurrences_household_due_idx").on(t.householdId, t.dueOn),
    index("occurrences_chore_idx").on(t.choreId),
    uniqueIndex("occurrences_one_open_per_chore").on(t.choreId).where(sql`${t.completedAt} is null`),
  ],
);

/** A one-time link from the Owner that lets one person join the Household. */
export const invites = pgTable("invites", {
  id: uuid("id").primaryKey().defaultRandom(),
  householdId: uuid("household_id").notNull().references(() => households.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  usedBy: text("used_by").references(() => user.id, { onDelete: "set null" }),
});
