CREATE TYPE "public"."schedule_kind" AS ENUM('every', 'weekdays');--> statement-breakpoint
CREATE TABLE "chores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"room_id" uuid,
	"fixture_id" uuid,
	"needs_room" boolean DEFAULT false NOT NULL,
	"name" text NOT NULL,
	"note" text,
	"effort" integer NOT NULL,
	"schedule_kind" "schedule_kind" NOT NULL,
	"every_days" integer,
	"weekdays" integer[],
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chores_schedule_shape" CHECK (("chores"."schedule_kind" = 'every' and "chores"."every_days" > 0) or ("chores"."schedule_kind" = 'weekdays' and cardinality("chores"."weekdays") > 0))
);
--> statement-breakpoint
CREATE TABLE "occurrences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"chore_id" uuid NOT NULL,
	"due_on" date NOT NULL,
	"completed_at" timestamp with time zone,
	"completed_by" text,
	"effort" integer
);
--> statement-breakpoint
ALTER TABLE "households" ADD COLUMN "time_zone" text DEFAULT 'Europe/Zagreb' NOT NULL;--> statement-breakpoint
ALTER TABLE "chores" ADD CONSTRAINT "chores_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chores" ADD CONSTRAINT "chores_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chores" ADD CONSTRAINT "chores_fixture_id_fixtures_id_fk" FOREIGN KEY ("fixture_id") REFERENCES "public"."fixtures"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chores" ADD CONSTRAINT "chores_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "occurrences" ADD CONSTRAINT "occurrences_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "occurrences" ADD CONSTRAINT "occurrences_chore_id_chores_id_fk" FOREIGN KEY ("chore_id") REFERENCES "public"."chores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "occurrences" ADD CONSTRAINT "occurrences_completed_by_user_id_fk" FOREIGN KEY ("completed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chores_household_idx" ON "chores" USING btree ("household_id");--> statement-breakpoint
CREATE INDEX "occurrences_household_due_idx" ON "occurrences" USING btree ("household_id","due_on");--> statement-breakpoint
CREATE UNIQUE INDEX "occurrences_one_open_per_chore" ON "occurrences" USING btree ("chore_id") WHERE "occurrences"."completed_at" is null;