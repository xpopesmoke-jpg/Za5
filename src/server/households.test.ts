import { beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "@/db/setup";
import type { Db } from "@/db/client";
import { makeUser } from "@/test/helpers";
import { ValidationError } from "./errors";
import { createHousehold, getMyHousehold } from "./households";

let db: Db;
let pope: string;

beforeEach(async () => {
  db = await createTestDb();
  pope = await makeUser(db, "Pope");
});

describe("naming your home", () => {
  it("creates a Household with you as its Owner", async () => {
    await createHousehold(db, pope, "Omiš flat");

    expect(await getMyHousehold(db, pope)).toMatchObject({ name: "Omiš flat", role: "owner" });
  });

  it("leaves someone who hasn't named a home yet without a Household", async () => {
    expect(await getMyHousehold(db, pope)).toBeNull();
  });

  it("refuses a second home, because a person belongs to one Household", async () => {
    await createHousehold(db, pope, "Omiš flat");

    await expect(createHousehold(db, pope, "Zagreb flat")).rejects.toThrow(ValidationError);
    expect(await getMyHousehold(db, pope)).toMatchObject({ name: "Omiš flat" });
  });

  it("trims the name you typed", async () => {
    await createHousehold(db, pope, "  Omiš flat  ");

    expect(await getMyHousehold(db, pope)).toMatchObject({ name: "Omiš flat" });
  });

  it("refuses a blank name or one longer than 60 characters", async () => {
    await expect(createHousehold(db, pope, "   ")).rejects.toThrow(ValidationError);
    await expect(createHousehold(db, pope, "x".repeat(61))).rejects.toThrow(ValidationError);
    expect(await getMyHousehold(db, pope)).toBeNull();
  });
});
