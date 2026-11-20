import { and, asc, count, eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { chores, fixtures, floors, households, planReadings, plans, rooms, user } from "@/db/schema";
import { DICT } from "@/i18n/dictionary";
import type { Lang } from "@/i18n/config";
import { FILE_BYTES_MAX, PAGE_BYTES_MAX, parseDraft, PLAN_PAGES_MAX, READER_SCHEMA, UnreadablePlanError, type DraftHome } from "@/domain/plan";
import { localDay } from "@/domain/schedule";
import { ROOM_NAME_MAX } from "@/domain/limits";
import { moveChoresToNeedsRoom, ownersHousehold } from "./home";
import { isUniqueViolation, NotFoundError, ValidationError } from "./errors";
import { getMyHousehold } from "./households";
import type { PlanStore } from "./plan-store";

/*
 * Plans: the Owner uploads the home's floor plan (a PDF or images; the browser turns each page into a JPEG),
 * Claude reads it into a draft home, and the Owner saves the draft with "Looks right". Readings are limited per
 * Household per day; a failed reading is given back.
 */

export const PLAN_READINGS_PER_DAY = 5;
const PLAN_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

/** Reads a Plan's pages (JPEG images, one Floor each) and answers with the raw draft, in the shape of `schema`. */
export type PlanReader = (input: { pages: { mediaType: "image/jpeg"; data: Buffer }[]; lang: Lang; schema: typeof READER_SCHEMA }) => Promise<unknown>;

export type PlanUpload = { files: { name: string; mediaType: string; data: Buffer }[]; pages: Buffer[] };

export type PlanView = {
  id: string;
  fileName: string;
  pageCount: number;
  status: "uploaded" | "read" | "failed";
  draft: DraftHome | null;
  uploadedAt: Date;
  /** Readings left today; null when there's no limit (the app owner) */
  readsLeft: number | null;
};

const isJpeg = (b: Buffer) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
/** Whether the file's first bytes match the type the browser said it is. */
const looksLike = (b: Buffer, mediaType: string) =>
  (<Record<string, () => boolean>>{
    "application/pdf": () => b.subarray(0, 5).toString("latin1") === "%PDF-",
    "image/jpeg": () => isJpeg(b),
    "image/png": () => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
    "image/webp": () => b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP",
    "image/heic": () => b.subarray(4, 8).toString("latin1") === "ftyp",
    "image/heif": () => b.subarray(4, 8).toString("latin1") === "ftyp",
  })[mediaType]?.() ?? false;
const extOf = (mediaType: string) => ({ "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic", "image/heif": "heif" })[mediaType] ?? "bin";

/** Keeps a new Plan for the Owner's home, replacing the earlier one and its files. */
export async function uploadPlan(db: Db, userId: string, input: PlanUpload, now: Date, store: PlanStore): Promise<string> {
  const household = await ownersHousehold(db, userId);
  const { files, pages } = input;
  if (pages.length === 0 || files.length === 0) throw new ValidationError("Choose a PDF or pictures of your plan.");
  if (pages.length > PLAN_PAGES_MAX || files.length > PLAN_PAGES_MAX) throw new ValidationError(`A plan can have up to ${PLAN_PAGES_MAX} pages.`);
  if (pages.some((p) => !isJpeg(p) || p.length > PAGE_BYTES_MAX)) throw new ValidationError("A page of the plan couldn't be read as a picture.");
  if (files.some((f) => !PLAN_TYPES.includes(f.mediaType) || !looksLike(f.data, f.mediaType))) throw new ValidationError("Choose a PDF or pictures (JPEG, PNG, WebP or HEIC).");
  if (files.reduce((s, f) => s + f.data.length, 0) > FILE_BYTES_MAX) throw new ValidationError("That plan is too big. Up to 20 MB, please.");

  const [old] = await db.select({ id: plans.id }).from(plans).where(eq(plans.householdId, household.id));
  const id = crypto.randomUUID();
  // files first, then the row: a failed write leaves no Plan pointing at missing files
  await Promise.all([
    ...files.map((f, i) => store.put(`${id}/original-${i + 1}.${extOf(f.mediaType)}`, f.data)),
    ...pages.map((p, i) => store.put(`${id}/page-${i + 1}.jpg`, p)),
  ]);
  const fileName = files.map((f) => f.name.replace(/[\r\n]/g, " ").slice(0, 120)).join(", ");
  try {
    await db.transaction(async (tx) => {
      if (old) await tx.delete(plans).where(eq(plans.id, old.id));
      await tx.insert(plans).values({ id, householdId: household.id, uploadedBy: userId, fileName, mediaType: files[0].mediaType, pageCount: pages.length, uploadedAt: now });
    });
  } catch (err) {
    await store.removeAll(id);
    if (isUniqueViolation(err)) throw new ValidationError("Another plan was being saved at the same time. Try again.");
    throw err;
  }
  if (old) await store.removeAll(old.id);
  return id;
}

/** The Owner's Plan, with today's readings left; null when none is uploaded. */
export async function getPlan(db: Db, userId: string, now: Date, unlimitedEmails: string[] = []): Promise<PlanView | null> {
  const household = await ownersHousehold(db, userId);
  const [plan] = await db.select().from(plans).where(eq(plans.householdId, household.id));
  if (!plan) return null;
  const unlimited = await isUnlimited(db, userId, unlimitedEmails);
  return {
    id: plan.id,
    fileName: plan.fileName,
    pageCount: plan.pageCount,
    status: plan.status,
    draft: plan.draft ?? null,
    uploadedAt: plan.uploadedAt,
    readsLeft: unlimited ? null : Math.max(0, PLAN_READINGS_PER_DAY - (await readingsOn(db, household.id, localDay(now, household.timeZone)))),
  };
}

/** One page of the Owner's Plan as a JPEG (pages count from 1). */
export async function planPage(db: Db, userId: string, page: number, store: PlanStore): Promise<Buffer> {
  const plan = await planOf(db, (await ownersHousehold(db, userId)).id);
  if (!Number.isInteger(page) || page < 1 || page > plan.pageCount) throw new NotFoundError("Page");
  const data = await store.get(`${plan.id}/page-${page}.jpg`);
  if (!data) throw new NotFoundError("Page");
  return data;
}

/** One of the files the Owner uploaded, as it was (files count from 1). */
export async function planOriginal(db: Db, userId: string, n: number, store: PlanStore) {
  const plan = await planOf(db, (await ownersHousehold(db, userId)).id);
  const names = plan.fileName.split(", ");
  if (!Number.isInteger(n) || n < 1) throw new NotFoundError("File");
  const mediaType = n === 1 ? plan.mediaType : null;
  for (const type of mediaType ? [mediaType] : PLAN_TYPES) {
    const data = await store.get(`${plan.id}/original-${n}.${extOf(type)}`);
    if (data) return { name: names[n - 1] ?? `plan-${n}`, mediaType: type, data };
  }
  throw new NotFoundError("File");
}

/** Whether the home has a Plan: any Member may know, for the privacy notice. */
export async function hasPlan(db: Db, userId: string): Promise<boolean> {
  const household = await getMyHousehold(db, userId);
  if (!household) return false;
  const [row] = await db.select({ id: plans.id }).from(plans).where(eq(plans.householdId, household.id));
  return !!row;
}

/**
 * Reads the Plan with Claude into a Draft home and keeps it for "Looks right". Counts against the
 * Household's daily readings unless the person is the app owner. A reading that fails (Claude didn't answer,
 * or answered nonsense) is given back; one that found no rooms counts, because Claude did read it.
 */
export async function readPlan(
  db: Db,
  userId: string,
  lang: Lang,
  now: Date,
  deps: { reader: PlanReader; store: PlanStore; unlimitedEmails: string[] },
): Promise<DraftHome> {
  const household = await ownersHousehold(db, userId);
  const plan = await planOf(db, household.id);
  const day = localDay(now, household.timeZone);
  const unlimited = await isUnlimited(db, userId, deps.unlimitedEmails);

  // Count this reading first (one at a time per Household, so two taps can't both take the last one).
  const readingId = await db.transaction(async (tx) => {
    await tx.select({ id: households.id }).from(households).where(eq(households.id, household.id)).for("update");
    if (!unlimited && (await readingsOn(tx, household.id, day)) >= PLAN_READINGS_PER_DAY) {
      throw new ValidationError(`You've used today's ${PLAN_READINGS_PER_DAY} Plan readings. You can read it again tomorrow.`);
    }
    const [row] = await tx.insert(planReadings).values({ householdId: household.id, userId, day, createdAt: now }).returning({ id: planReadings.id });
    return row.id;
  });

  try {
    const pages = await Promise.all(
      Array.from({ length: plan.pageCount }, async (_, i) => {
        const data = await deps.store.get(`${plan.id}/page-${i + 1}.jpg`);
        if (!data) throw new NotFoundError("Plan page");
        return { mediaType: "image/jpeg" as const, data };
      }),
    );
    const draft = parseDraft(await deps.reader({ pages, lang, schema: READER_SCHEMA }), plan.pageCount);
    await db.update(plans).set({ status: "read", draft, readAt: now }).where(eq(plans.id, plan.id));
    return draft;
  } catch (err) {
    if (!(err instanceof UnreadablePlanError)) await db.delete(planReadings).where(eq(planReadings.id, readingId));
    // an earlier good draft stays, so a failed "Read again" loses nothing
    if (!plan.draft) await db.update(plans).set({ status: "failed" }).where(eq(plans.id, plan.id));
    if (err instanceof UnreadablePlanError) throw new ValidationError(err.message);
    throw err;
  }
}

/**
 * "Looks right": the draft becomes the home. Floors are reused in order; a Room whose name matches an existing
 * Room (ignoring case) keeps its id and so its Chores; Rooms that aren't on the Plan go, and their Chores wait
 * in "Needs a new room".
 */
export async function applyPlanDraft(db: Db, userId: string, lang: Lang): Promise<void> {
  const household = await ownersHousehold(db, userId);
  const plan = await planOf(db, household.id);
  if (plan.status !== "read" || !plan.draft) throw new ValidationError("Read the plan first.");
  const draftFloors = plan.draft.floors.filter((f) => f.rooms.length > 0);
  const roomTypeName = DICT[lang].rooms.roomTypes;

  await db.transaction(async (tx) => {
    const oldFloors = await tx.select().from(floors).where(eq(floors.householdId, household.id)).orderBy(asc(floors.position));
    const oldRooms = await tx.select().from(rooms).where(eq(rooms.householdId, household.id)).orderBy(asc(rooms.position));
    const kept = new Set<string>();

    for (const [i, f] of draftFloors.entries()) {
      let floorId = oldFloors[i]?.id;
      if (floorId) await tx.update(floors).set({ name: f.name ?? oldFloors[i].name, openings: f.openings, position: i }).where(eq(floors.id, floorId));
      else [{ id: floorId }] = await tx.insert(floors).values({ householdId: household.id, name: f.name, position: i, openings: f.openings }).returning({ id: floors.id });

      for (const [j, r] of f.rooms.entries()) {
        const name = (r.name.trim() || roomTypeName[r.type] || r.type).slice(0, ROOM_NAME_MAX);
        const match = oldRooms.find((o) => !kept.has(o.id) && o.name.trim().toLowerCase() === name.toLowerCase());
        let roomId: string;
        if (match) {
          roomId = match.id;
          kept.add(roomId);
          // its Fixtures are replaced by the Plan's; Chores on them stay in the Room
          await tx.update(chores).set({ fixtureId: null }).where(eq(chores.roomId, roomId));
          await tx.delete(fixtures).where(eq(fixtures.roomId, roomId));
          await tx.update(rooms).set({ floorId, type: r.type, name, outline: r.outline, position: j }).where(eq(rooms.id, roomId));
        } else {
          [{ id: roomId }] = await tx.insert(rooms).values({ householdId: household.id, floorId, type: r.type, name, outline: r.outline, position: j }).returning({ id: rooms.id });
        }
        if (r.fixtures.length) {
          await tx.insert(fixtures).values(r.fixtures.map((x, k) => ({ householdId: household.id, roomId, type: x.type, at: x.at, position: k })));
        }
      }
    }

    for (const o of oldRooms.filter((r) => !kept.has(r.id))) {
      await moveChoresToNeedsRoom(tx, eq(chores.roomId, o.id));
      await tx.delete(rooms).where(eq(rooms.id, o.id));
    }
    for (const f of oldFloors.slice(draftFloors.length)) await tx.delete(floors).where(eq(floors.id, f.id));
  });
}

/** Delete plan: removes the stored files and the Plan; the home stays as it is. */
export async function deletePlan(db: Db, userId: string, store: PlanStore): Promise<void> {
  const plan = await planOf(db, (await ownersHousehold(db, userId)).id);
  await db.delete(plans).where(eq(plans.id, plan.id));
  await store.removeAll(plan.id);
}

/** The Household's Plan (callers check the Owner first). */
async function planOf(db: Db, householdId: string) {
  const [plan] = await db.select().from(plans).where(eq(plans.householdId, householdId));
  if (!plan) throw new NotFoundError("Plan");
  return plan;
}

async function readingsOn(db: Pick<Db, "select">, householdId: string, day: string) {
  const [{ n }] = await db
    .select({ n: count() })
    .from(planReadings)
    .where(and(eq(planReadings.householdId, householdId), eq(planReadings.day, day)));
  return n;
}

async function isUnlimited(db: Db, userId: string, emails: string[]) {
  if (!emails.length) return false;
  const [me] = await db.select({ email: user.email }).from(user).where(eq(user.id, userId));
  return !!me && emails.some((e) => e.trim().toLowerCase() === me.email.toLowerCase());
}
