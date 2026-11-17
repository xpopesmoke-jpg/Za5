-- Every home has at least one Floor. Homes created before Floors existed get their first one here.
INSERT INTO "floors" ("household_id", "position")
SELECT "households"."id", 0 FROM "households"
WHERE NOT EXISTS (SELECT 1 FROM "floors" WHERE "floors"."household_id" = "households"."id");
