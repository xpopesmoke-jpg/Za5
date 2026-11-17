import { afterEach, describe, expect, it, vi } from "vitest";
import { databaseTarget } from "./client";

afterEach(() => vi.unstubAllEnvs());

describe("choosing the database", () => {
  it("uses Postgres when DATABASE_URL points at it", () => {
    vi.stubEnv("DATABASE_URL", "postgres://za5@db/za5");
    expect(databaseTarget()).toEqual({ kind: "postgres", url: "postgres://za5@db/za5" });
  });

  it("refuses to fall back to the local database in production, so data is never lost on redeploy", () => {
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("NODE_ENV", "production");
    expect(() => databaseTarget()).toThrow(/DATABASE_URL/);
  });
});
