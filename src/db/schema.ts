import { sql } from "drizzle-orm";
import { index, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
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

