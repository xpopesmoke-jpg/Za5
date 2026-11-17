import { beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "@/db/setup";
import type { Db } from "@/db/client";
import { createAuth } from "./auth";
import { createHousehold, getMyHousehold } from "./households";

let db: Db;
let auth: ReturnType<typeof createAuth>;

beforeEach(async () => {
  db = await createTestDb();
  auth = createAuth(db, { secret: "test-secret-test-secret-test-secret", baseURL: "http://localhost:3000" });
});

describe("signing up", () => {
  it("creates an account with no home until it names one", async () => {
    const { user } = await auth.api.signUpEmail({ body: { name: "Pope", email: "pope@example.com", password: "correct-horse-1" } });

    expect(await getMyHousehold(db, user.id)).toBeNull();
    await createHousehold(db, user.id, "Omiš flat");
    expect(await getMyHousehold(db, user.id)).toMatchObject({ name: "Omiš flat", role: "owner" });
  });

  it("refuses a password shorter than 8 characters", async () => {
    await expect(auth.api.signUpEmail({ body: { name: "Pope", email: "pope@example.com", password: "short" } })).rejects.toThrow();
  });
});
