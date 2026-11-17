CREATE TYPE "public"."fixture_type" AS ENUM('shower', 'bathtub', 'toilet', 'sink', 'oven', 'hob', 'fridge', 'dishwasher', 'washing_machine', 'dryer', 'counter', 'window');--> statement-breakpoint
CREATE TYPE "public"."room_type" AS ENUM('kitchen', 'living', 'dining', 'bedroom', 'kids', 'bathroom', 'toilet', 'hall', 'laundry', 'office', 'storage', 'terrace', 'other');--> statement-breakpoint
CREATE TABLE "fixtures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"room_id" uuid NOT NULL,
	"type" "fixture_type" NOT NULL,
	"position" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "floors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"name" text,
	"position" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rooms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"floor_id" uuid NOT NULL,
	"type" "room_type" NOT NULL,
	"name" text NOT NULL,
	"position" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fixtures" ADD CONSTRAINT "fixtures_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixtures" ADD CONSTRAINT "fixtures_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "floors" ADD CONSTRAINT "floors_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_floor_id_floors_id_fk" FOREIGN KEY ("floor_id") REFERENCES "public"."floors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "fixtures_room_idx" ON "fixtures" USING btree ("room_id");--> statement-breakpoint
CREATE INDEX "floors_household_idx" ON "floors" USING btree ("household_id");--> statement-breakpoint
CREATE INDEX "rooms_floor_idx" ON "rooms" USING btree ("floor_id");