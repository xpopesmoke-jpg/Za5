import { beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "@/db/setup";
import type { Db } from "@/db/client";
import { addMember, makeUser } from "@/test/helpers";
import { createHousehold, getMyHousehold } from "./households";
import { NotAllowedError, ValidationError } from "./errors";
import { acceptInvite, createInvite, getInvite, isInviteToken, joinIfInvited } from "./invites";

const at = (local: string) => new Date(local.replace(" ", "T") + ":00+01:00");

let db: Db;
let pope: string;
let homeId: string;

beforeEach(async () => {
  db = await createTestDb();
  pope = await makeUser(db, "Pope");
  homeId = (await createHousehold(db, pope, "Omiš flat")).id;
});

describe("inviting a partner", () => {
  it("lets the invited person join the Owner's Household after they sign up", async () => {
    const { token } = await createInvite(db, pope, at("2026-11-18 09:00"));
    const ana = await makeUser(db, "Ana");

    await acceptInvite(db, ana, token, at("2026-11-18 20:00"));

    expect(await getMyHousehold(db, ana)).toMatchObject({ id: homeId, name: "Omiš flat", role: "member" });
  });

  it("shows who is inviting to which home before they sign up", async () => {
    const { token } = await createInvite(db, pope, at("2026-11-18 09:00"));

    expect(await getInvite(db, token, at("2026-11-18 10:00"))).toEqual({ householdName: "Omiš flat", invitedBy: "Pope" });
    expect(await getInvite(db, "made-up", at("2026-11-18 10:00"))).toBeNull();
  });

  it("works once: a used link lets no one else in", async () => {
    const { token } = await createInvite(db, pope, at("2026-11-18 09:00"));
    await acceptInvite(db, await makeUser(db, "Ana"), token, at("2026-11-18 10:00"));
    const zoe = await makeUser(db, "Zoe");

    await expect(acceptInvite(db, zoe, token, at("2026-11-18 11:00"))).rejects.toThrow(ValidationError);
    expect(await getInvite(db, token, at("2026-11-18 11:00"))).toBeNull();
    expect(await getMyHousehold(db, zoe)).toBeNull();
  });

  it("runs out after 7 days", async () => {
    const { token } = await createInvite(db, pope, at("2026-11-18 09:00"));

    expect(await getInvite(db, token, at("2026-11-25 09:01"))).toBeNull();
    await expect(acceptInvite(db, await makeUser(db, "Ana"), token, at("2026-11-25 09:01"))).rejects.toThrow(ValidationError);
  });

  it("does not move someone who already belongs to a home", async () => {
    const zoe = await makeUser(db, "Zoe");
    const zoesHome = (await createHousehold(db, zoe, "Zoe's flat")).id;
    const { token } = await createInvite(db, pope, at("2026-11-18 09:00"));

    await expect(acceptInvite(db, zoe, token, at("2026-11-18 10:00"))).rejects.toThrow(ValidationError);
    expect((await getMyHousehold(db, zoe))?.id).toBe(zoesHome);
    // The link is still there for the right person.
    expect(await getInvite(db, token, at("2026-11-18 10:00"))).not.toBeNull();
  });

  it("is only for the Owner to send", async () => {
    const ana = await makeUser(db, "Ana");
    await addMember(db, homeId, ana);

    await expect(createInvite(db, ana, at("2026-11-18 09:00"))).rejects.toThrow(NotAllowedError);
  });
});

describe("joining straight from sign-up", () => {
  it("joins the Household with the invite token right after the account is made", async () => {
    const { token } = await createInvite(db, pope, at("2026-11-18 09:00"));
    const ana = await makeUser(db, "Ana");

    expect(await joinIfInvited(db, ana, token, at("2026-11-18 10:00"))).toBe(true);
    expect((await getMyHousehold(db, ana))?.id).toBe(homeId);
  });

  it("leaves a person without a home when the token is not usable, so the join page can explain", async () => {
    const ana = await makeUser(db, "Ana");

    expect(await joinIfInvited(db, ana, "x".repeat(32), at("2026-11-18 10:00"))).toBe(false);
    expect(await getMyHousehold(db, ana)).toBeNull();
  });
});

describe("invite tokens", () => {
  it("knows a token's shape, so nothing else rides through sign-in", async () => {
    const { token } = await createInvite(db, pope, at("2026-11-18 09:00"));

    expect(isInviteToken(token)).toBe(true);
    expect(isInviteToken("../../evil")).toBe(false);
    expect(isInviteToken("")).toBe(false);
  });
});
