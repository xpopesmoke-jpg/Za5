CREATE TABLE "za5_presses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"occurrence_id" uuid,
	"pressed_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
DROP INDEX "occurrences_one_open_per_chore";--> statement-breakpoint
ALTER TABLE "households" ADD COLUMN "away_since" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "occurrences" ADD COLUMN "postponed_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "occurrences" ADD COLUMN "skipped_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "occurrences" ADD COLUMN "skipped_by" text;--> statement-breakpoint
ALTER TABLE "za5_presses" ADD CONSTRAINT "za5_presses_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "za5_presses" ADD CONSTRAINT "za5_presses_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "za5_presses" ADD CONSTRAINT "za5_presses_occurrence_id_occurrences_id_fk" FOREIGN KEY ("occurrence_id") REFERENCES "public"."occurrences"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "za5_presses_user_idx" ON "za5_presses" USING btree ("user_id","pressed_at");--> statement-breakpoint
ALTER TABLE "occurrences" ADD CONSTRAINT "occurrences_skipped_by_user_id_fk" FOREIGN KEY ("skipped_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "occurrences_one_open_per_chore" ON "occurrences" USING btree ("chore_id") WHERE "occurrences"."completed_at" is null and "occurrences"."skipped_at" is null;