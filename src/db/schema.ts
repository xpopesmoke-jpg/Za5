import { sql } from "drizzle-orm";
import { boolean, check, date, index, integer, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

export * from "./auth-schema";

/** The people who share one home and its Chores. */
/** A door or window on a Floor: its middle point and width in centimetres. */
export type Opening = { kind: "door" | "window"; at: [number, number]; width: number };

/** What the Plan reader found, kept until the Owner says "Looks right" (see src/domain/plan.ts). */
export type DraftHomeJson = import("@/domain/plan").DraftHome;

export const households = pgTable("households", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  // "Today" and due days are counted in the home's own time zone.
  timeZone: text("time_zone").notNull().default("Europe/Zagreb"),
  // Away: set while the Household is away (a holiday); nothing becomes overdue meanwhile.
  awaySince: timestamp("away_since", { withTimezone: true }),
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
    // Doors and windows read from the Plan, in centimetres on the Floor; empty until a Plan is read.
    openings: jsonb("openings").$type<Opening[]>(),
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
    // The Room's outline on its Floor, in centimetres ([x, y] corners, clockwise). Empty until read from the
    // Plan or drawn; the Home map lays such Rooms out on its own meanwhile.
    outline: jsonb("outline").$type<[number, number][]>(),
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
    // Where it stands on the Floor, in centimetres, when the Plan showed it; otherwise the map places it.
    at: jsonb("at").$type<[number, number]>(),
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
    // The starter-library entry it came from, if any, so a walkthrough reopened later knows it is already there.
    libraryKey: text("library_key"),
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
    // Za5: put off until this moment (later today, or tomorrow morning); not overdue meanwhile.
    postponedUntil: timestamp("postponed_until", { withTimezone: true }),
    // Skip: dropped this time, with no credit.
    skippedAt: timestamp("skipped_at", { withTimezone: true }),
    skippedBy: text("skipped_by").references(() => user.id, { onDelete: "set null" }),
  },
  (t) => [
    index("occurrences_household_due_idx").on(t.householdId, t.dueOn),
    index("occurrences_chore_idx").on(t.choreId),
    index("occurrences_claimed_by_idx").on(t.claimedBy),
    // Open means neither done nor Skipped.
    uniqueIndex("occurrences_one_open_per_chore").on(t.choreId).where(sql`${t.completedAt} is null and ${t.skippedAt} is null`),
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

/** Each press of Za5, for the Member's playful monthly count. */
export const za5Presses = pgTable(
  "za5_presses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id").notNull().references(() => households.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    occurrenceId: uuid("occurrence_id").references(() => occurrences.id, { onDelete: "set null" }),
    pressedAt: timestamp("pressed_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("za5_presses_user_idx").on(t.userId, t.pressedAt)],
);

export const planStatus = pgEnum("plan_status", ["uploaded", "read", "failed"]);

/**
 * A Household's Plan: the uploaded file and its pages as images, kept on the server's volume (see PlanStore).
 * One per Household; uploading a new Plan replaces it.
 */
export const plans = pgTable("plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  householdId: uuid("household_id")
    .notNull()
    .unique()
    .references(() => households.id, { onDelete: "cascade" }),
  uploadedBy: text("uploaded_by").references(() => user.id, { onDelete: "set null" }),
  fileName: text("file_name").notNull(),
  mediaType: text("media_type").notNull(),
  pageCount: integer("page_count").notNull(),
  status: planStatus("status").notNull().default("uploaded"),
  draft: jsonb("draft").$type<DraftHomeJson>(),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull(),
  readAt: timestamp("read_at", { withTimezone: true }),
});

/** One Plan reading, counted against the Household's daily limit; a failed reading's row is removed (refunded). */
export const planReadings = pgTable(
  "plan_readings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id").notNull().references(() => households.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    // the Household's local day the reading counts against
    day: date("day", { mode: "string" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("plan_readings_household_day_idx").on(t.householdId, t.day)],
);
