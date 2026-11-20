CREATE TYPE "public"."plan_status" AS ENUM('uploaded', 'read', 'failed');--> statement-breakpoint
CREATE TABLE "plan_readings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"user_id" text,
	"day" date NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"uploaded_by" text,
	"file_name" text NOT NULL,
	"media_type" text NOT NULL,
	"page_count" integer NOT NULL,
	"status" "plan_status" DEFAULT 'uploaded' NOT NULL,
	"draft" jsonb,
	"uploaded_at" timestamp with time zone NOT NULL,
	"read_at" timestamp with time zone,
	CONSTRAINT "plans_household_id_unique" UNIQUE("household_id")
);
--> statement-breakpoint
ALTER TABLE "fixtures" ADD COLUMN "at" jsonb;--> statement-breakpoint
ALTER TABLE "floors" ADD COLUMN "openings" jsonb;--> statement-breakpoint
ALTER TABLE "plan_readings" ADD CONSTRAINT "plan_readings_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_readings" ADD CONSTRAINT "plan_readings_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plans" ADD CONSTRAINT "plans_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plans" ADD CONSTRAINT "plans_uploaded_by_user_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "plan_readings_household_day_idx" ON "plan_readings" USING btree ("household_id","day");