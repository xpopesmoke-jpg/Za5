import { beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "@/db/setup";
import type { Db } from "@/db/client";
import { addMember, makeUser } from "@/test/helpers";
import { createHousehold } from "./households";
import { addFixture, addRoom, getHome } from "./home";
import { addChore, getToday } from "./chores";
import { applyPlanDraft, deletePlan, getPlan, hasPlan, planOriginal, planPage, readPlan, uploadPlan, type PlanReader } from "./plans";
import { memoryPlanStore, type PlanStore } from "./plan-store";
import { NotAllowedError, ValidationError } from "./errors";
import { READER_SCHEMA } from "@/domain/plan";

const at = (local: string) => new Date(local.replace(" ", "T") + ":00+01:00");
const jpeg = (tag: string) => Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.from(tag)]);
const pdf = Buffer.from("%PDF-1.7 two floors");

/** A reader that answers with a fixed draft and remembers what it was sent. */
function fakeReader(answer: unknown = twoRooms) {
  const calls: Parameters<PlanReader>[0][] = [];
  const reader: PlanReader = async (input) => {
    calls.push(input);
    if (answer instanceof Error) throw answer;
    return answer;
  };
  return { reader, calls };
}

const pt = (x: number, y: number) => ({ x, y });
const rect = (x: number, y: number, w: number, h: number) => [pt(x, y), pt(x + w, y), pt(x + w, y + h), pt(x, y + h)];
const twoRooms = {
  floors: [
    {
      isFloorPlan: true,
      name: null,
      rooms: [
        { name: "Bathroom", type: "bathroom", outline: rect(100, 50, 200, 250), fixtures: [{ type: "shower", at: pt(150, 100) }] },
        // drawn anticlockwise, with a type the app doesn't know
        { name: "Sauna", type: "spa", outline: [pt(300, 50), pt(300, 300), pt(600, 300), pt(600, 50)], fixtures: [] },
      ],
      openings: [{ kind: "door", at: pt(300, 200), width: 80 }],
    },
  ],
};

let db: Db;
let pope: string;
let nina: string;
let store: PlanStore;
const now = at("2026-11-20 10:00");

beforeEach(async () => {
  db = await createTestDb();
  pope = await makeUser(db, "Pope");
  nina = await makeUser(db, "Nina");
  const home = await createHousehold(db, pope, "Omiš flat");
  await addMember(db, home.id, nina);
  store = memoryPlanStore();
});

const upload = (pages = [jpeg("p1")], who = pope) =>
  uploadPlan(db, who, { files: [{ name: "tlocrt.pdf", mediaType: "application/pdf", data: pdf }], pages }, now, store);
const read = (reader: PlanReader, when = now, unlimitedEmails: string[] = []) => readPlan(db, pope, "en", when, { reader, store, unlimitedEmails });

describe("uploading a Plan", () => {
  it("keeps the file and its pages, one Floor per page", async () => {
    await upload([jpeg("ground"), jpeg("first")]);

    const plan = await getPlan(db, pope, now);
    expect(plan).toMatchObject({ fileName: "tlocrt.pdf", pageCount: 2, status: "uploaded", draft: null, readsLeft: 5 });
    expect((await planPage(db, pope, 2, store)).toString()).toContain("first");
  });

  it("is for the Owner only", async () => {
    await expect(upload([jpeg("p1")], nina)).rejects.toThrow(NotAllowedError);
  });

  it("lets the Owner open the original file, and tells every Member there is a Plan", async () => {
    expect(await hasPlan(db, nina)).toBe(false);
    await upload();

    expect(await planOriginal(db, pope, 1, store)).toEqual({ name: "tlocrt.pdf", mediaType: "application/pdf", data: pdf });
    await expect(planOriginal(db, nina, 1, store)).rejects.toThrow(NotAllowedError);
    expect(await hasPlan(db, nina)).toBe(true);
  });

  it("refuses what isn't a picture, and too many pages", async () => {
    await expect(upload([Buffer.from("not a picture")])).rejects.toThrow(ValidationError);
    // a file that says it's a PDF but isn't
    await expect(uploadPlan(db, pope, { files: [{ name: "x.pdf", mediaType: "application/pdf", data: Buffer.from("MZ...") }], pages: [jpeg("p")] }, now, store)).rejects.toThrow(ValidationError);
    expect(await store.list()).toEqual([]);
    await expect(upload([])).rejects.toThrow(ValidationError);
    await expect(upload(Array.from({ length: 7 }, (_, i) => jpeg(`p${i}`)))).rejects.toThrow(ValidationError);
  });

  it("replaces the earlier Plan and its files", async () => {
    await upload([jpeg("old one"), jpeg("old two")]);
    await upload([jpeg("new one")]);

    expect((await getPlan(db, pope, now))?.pageCount).toBe(1);
    expect((await planPage(db, pope, 1, store)).toString()).toContain("new one");
    await expect(planPage(db, pope, 2, store)).rejects.toThrow();
  });
});

describe("reading a Plan", () => {
  it("sends the pages to the reader and keeps a clean draft to show", async () => {
    await upload([jpeg("ground")]);
    const { reader, calls } = fakeReader();

    const draft = await read(reader);

    expect(calls).toHaveLength(1);
    expect(calls[0].lang).toBe("en");
    expect(calls[0].schema).toBe(READER_SCHEMA);
    expect(calls[0].pages.map((p) => p.data.toString())).toEqual([jpeg("ground").toString()]);
    expect(draft.floors).toHaveLength(1);
    const [bath, other] = draft.floors[0].rooms;
    // moved so the Floor starts at 0,0
    expect(bath).toMatchObject({ name: "Bathroom", type: "bathroom", outline: [[0, 0], [200, 0], [200, 250], [0, 250]], fixtures: [{ type: "shower", at: [50, 50] }] });
    // clockwise, and an unknown type becomes "other"
    expect(other).toMatchObject({ type: "other", outline: [[500, 0], [500, 250], [200, 250], [200, 0]] });
    expect(draft.floors[0].openings).toEqual([{ kind: "door", at: [200, 150], width: 80 }]);
    expect((await getPlan(db, pope, now))?.status).toBe("read");
  });

  it("allows 5 readings a day for a Household, and more the next day", async () => {
    await upload();
    const { reader } = fakeReader();
    for (let i = 0; i < 5; i++) await read(reader);

    await expect(read(reader)).rejects.toThrow(/5 Plan readings/);
    expect((await getPlan(db, pope, now))?.readsLeft).toBe(0);
    await expect(read(reader, at("2026-11-21 08:00"))).resolves.toBeDefined();
  });

  it("has no daily limit for the app owner", async () => {
    await upload();
    const { reader } = fakeReader();
    for (let i = 0; i < 7; i++) await read(reader, now, ["pope@example.com"]);

    expect((await getPlan(db, pope, now, ["pope@example.com"]))?.readsLeft).toBeNull();
  });

  it("gives a failed reading back", async () => {
    await upload();
    for (let i = 0; i < 6; i++) await expect(read(fakeReader(new Error("overloaded")).reader)).rejects.toThrow();

    expect(await getPlan(db, pope, now)).toMatchObject({ status: "failed", readsLeft: 5 });
    await expect(read(fakeReader().reader)).resolves.toBeDefined();
  });

  it("counts a reading that found no rooms, since Claude did read it", async () => {
    await upload();
    await expect(read(fakeReader({ floors: [{ isFloorPlan: false, name: null, rooms: [], openings: [] }] }).reader)).rejects.toThrow(/No rooms/);

    expect(await getPlan(db, pope, now)).toMatchObject({ status: "failed", readsLeft: 4 });
  });

  it("keeps the earlier draft when reading again fails", async () => {
    await upload();
    await read(fakeReader().reader);

    await expect(read(fakeReader(new Error("overloaded")).reader)).rejects.toThrow();

    const plan = await getPlan(db, pope, now);
    expect(plan).toMatchObject({ status: "read", readsLeft: 4 });
    expect(plan?.draft?.floors[0].rooms).toHaveLength(2);
  });

  it("needs an uploaded Plan, and is for the Owner only", async () => {
    await expect(read(fakeReader().reader)).rejects.toThrow();
    await upload();
    await expect(readPlan(db, nina, "en", now, { reader: fakeReader().reader, store, unlimitedEmails: [] })).rejects.toThrow(NotAllowedError);
  });
});

describe("saving the draft as the home", () => {
  it("builds the Floors, Rooms, Fixtures and doors from the draft", async () => {
    await upload([jpeg("ground"), jpeg("first")]);
    await read(
      fakeReader({
        floors: [twoRooms.floors[0], { isFloorPlan: true, name: "First floor", rooms: [{ name: "", type: "bedroom", outline: rect(0, 0, 300, 300), fixtures: [] }], openings: [] }],
      }).reader,
    );

    await applyPlanDraft(db, pope, "en");

    const home = await getHome(db, pope);
    expect(home.floors.map((f) => [f.name, f.rooms.map((r) => r.name)])).toEqual([
      [null, ["Bathroom", "Sauna"]],
      ["First floor", ["Bedroom"]],
    ]);
    expect(home.floors[0].rooms[0]).toMatchObject({ outline: [[0, 0], [200, 0], [200, 250], [0, 250]], fixtures: [{ type: "shower", at: [50, 50] }] });
    expect(home.floors[0].openings).toEqual([{ kind: "door", at: [200, 150], width: 80 }]);
  });

  it("keeps a Room with the same name, and its Chores; Rooms not on the Plan send their Chores to Needs a new room", async () => {
    const ground = (await getHome(db, pope)).floors[0].id;
    const bath = await addRoom(db, pope, ground, { type: "bathroom", name: "bathroom" });
    await addFixture(db, pope, bath, "bathtub");
    const attic = await addRoom(db, pope, ground, { type: "storage", name: "Attic" });
    await addChore(db, pope, { name: "Clean the tub", roomId: bath, schedule: { kind: "every", days: 7 }, effort: 10 }, now);
    await addChore(db, pope, { name: "Sort boxes", roomId: attic, schedule: { kind: "every", days: 30 }, effort: 20 }, now);
    await upload();
    await read(fakeReader().reader);

    await applyPlanDraft(db, pope, "en");

    const rooms = (await getHome(db, pope)).floors[0].rooms;
    expect(rooms.map((r) => r.name)).toEqual(["Bathroom", "Sauna"]);
    expect(rooms[0].id).toBe(bath);
    expect(rooms[0].fixtures.map((f) => f.type)).toEqual(["shower"]);
    const today = await getToday(db, pope, now);
    expect(today.find((i) => i.name === "Clean the tub")).toMatchObject({ roomId: bath, needsRoom: false });
    expect(today.find((i) => i.name === "Sort boxes")).toMatchObject({ roomId: null, needsRoom: true });
  });

  it("needs a read draft, and is for the Owner only", async () => {
    await upload();
    await expect(applyPlanDraft(db, pope, "en")).rejects.toThrow(ValidationError);
    await read(fakeReader().reader);
    await expect(applyPlanDraft(db, nina, "en")).rejects.toThrow(NotAllowedError);
  });
});

describe("deleting the Plan", () => {
  it("removes the stored files and keeps the home", async () => {
    await upload([jpeg("ground")]);
    await read(fakeReader().reader);
    await applyPlanDraft(db, pope, "en");

    await deletePlan(db, pope, store);

    expect(await getPlan(db, pope, now)).toBeNull();
    expect(await store.list()).toEqual([]);
    expect((await getHome(db, pope)).floors[0].rooms).toHaveLength(2);
  });

  it("is for the Owner only", async () => {
    await upload();
    await expect(deletePlan(db, nina, store)).rejects.toThrow(NotAllowedError);
  });
});
