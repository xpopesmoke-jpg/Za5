import { FIXTURE_TYPES, ROOM_TYPES, type FixtureType, type RoomType } from "@/server/home-types";
import { clockwise, signedArea2, type Outline } from "./layout";

/*
 * The draft home a Plan reading produces: one Floor per page or image, each with its Rooms (outline in
 * centimetres, x to the right and y down from the drawing's top-left), doors, windows and Fixtures. It is shown
 * beside the Plan and becomes the home only when the Owner says "Looks right".
 */

export const OUTLINE_MAX_CM = 10_000;
export const PLAN_PAGES_MAX = 6;
/** Size limits for one upload; together they stay under the proxy's 40 MB body limit (next.config.ts). */
export const PAGE_BYTES_MAX = 3 * 1024 * 1024;
export const FILE_BYTES_MAX = 20 * 1024 * 1024;
export const DRAFT_ROOMS_MAX = 30;
export const DRAFT_FIXTURES_MAX = 12;
export const DRAFT_OPENINGS_MAX = 60;
const NAME_MAX = 40;

export type DraftFixture = { type: FixtureType; at: [number, number] | null };
export type DraftRoom = { name: string; type: RoomType; outline: Outline | null; fixtures: DraftFixture[] };
export type DraftOpening = { kind: "door" | "window"; at: [number, number]; width: number };
export type DraftFloor = { name: string | null; rooms: DraftRoom[]; openings: DraftOpening[] };
export type DraftHome = { floors: DraftFloor[] };

/** Fixtures the reader may return; windows are openings, not Fixtures. */
const READER_FIXTURES: FixtureType[] = FIXTURE_TYPES.filter((f) => f !== "window");

const point = {
  type: "object",
  properties: { x: { type: "number" }, y: { type: "number" } },
  required: ["x", "y"],
  additionalProperties: false,
} as const;

/** The structure the reader must return (JSON Schema, for structured output). */
export const READER_SCHEMA = {
  type: "object",
  properties: {
    floors: {
      type: "array",
      description: "One entry per image, in the same order as the images.",
      items: {
        type: "object",
        properties: {
          isFloorPlan: { type: "boolean", description: "false when the image is not a floor plan of a home" },
          name: { anyOf: [{ type: "string" }, { type: "null" }], description: "The floor's name if the plan shows one, e.g. 'Ground floor'" },
          rooms: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                type: { type: "string", enum: ROOM_TYPES },
                outline: { type: "array", items: point, description: "Corners of the room in centimetres, in order around the room" },
                fixtures: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: { type: { type: "string", enum: READER_FIXTURES }, at: point },
                    required: ["type", "at"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["name", "type", "outline", "fixtures"],
              additionalProperties: false,
            },
          },
          openings: {
            type: "array",
            items: {
              type: "object",
              properties: { kind: { type: "string", enum: ["door", "window"] }, at: point, width: { type: "number", description: "centimetres" } },
              required: ["kind", "at", "width"],
              additionalProperties: false,
            },
          },
        },
        required: ["isFloorPlan", "name", "rooms", "openings"],
        additionalProperties: false,
      },
    },
  },
  required: ["floors"],
  additionalProperties: false,
} as const;

/** The reader's answer couldn't be used (no rooms found, or not a floor plan). The message is safe to show. */
export class UnreadablePlanError extends Error {}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const inRange = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= -OUTLINE_MAX_CM && v <= OUTLINE_MAX_CM;
const pt = (v: unknown): [number, number] | null => (isObj(v) && inRange(v.x) && inRange(v.y) ? [v.x, v.y] : null);
const list = (v: unknown) => (Array.isArray(v) ? v : []);
const cleanName = (v: unknown) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, NAME_MAX) : "");

/**
 * The reader's raw answer made safe to show and save: unknown types become "other" (or are dropped for
 * Fixtures), broken outlines become null so the map lays the Room out itself, everything is shifted so the
 * Floor starts at 0,0, and outlines run clockwise. Throws UnreadablePlanError when no Room was found at all.
 */
export function parseDraft(raw: unknown, pageCount: number): DraftHome {
  const floors = list(isObj(raw) ? raw.floors : null).slice(0, pageCount);
  const result: DraftHome = { floors: [] };
  for (let i = 0; i < pageCount; i++) {
    const f = isObj(floors[i]) ? (floors[i] as Record<string, unknown>) : {};
    const rooms: DraftRoom[] = f.isFloorPlan === false ? [] : list(f.rooms).slice(0, DRAFT_ROOMS_MAX).flatMap((r) => (isObj(r) ? [room(r)] : []));
    const openings: DraftOpening[] =
      f.isFloorPlan === false
        ? []
        : list(f.openings)
            .slice(0, DRAFT_OPENINGS_MAX)
            .flatMap((o) => {
              if (!isObj(o) || (o.kind !== "door" && o.kind !== "window")) return [];
              const at = pt(o.at);
              const width = typeof o.width === "number" && o.width > 20 && o.width < 600 ? Math.round(o.width) : 90;
              return at ? [{ kind: o.kind, at, width }] : [];
            });
    result.floors.push(shiftToOrigin({ name: cleanName(f.name) || null, rooms, openings }));
  }
  if (!result.floors.some((f) => f.rooms.length > 0)) throw new UnreadablePlanError("No rooms were found on this Plan.");
  return result;
}

function room(r: Record<string, unknown>): DraftRoom {
  const type = ROOM_TYPES.includes(r.type as RoomType) ? (r.type as RoomType) : "other";
  const corners = list(r.outline).map(pt);
  let outline: Outline | null = corners.length >= 3 && corners.length <= 64 && corners.every(Boolean) ? (corners as Outline) : null;
  // at least 0.1 m² of floor, so a line or a dot isn't a room
  if (outline && Math.abs(signedArea2(outline)) / 2 < 1_000) outline = null;
  const fixtures = list(r.fixtures)
    .slice(0, DRAFT_FIXTURES_MAX)
    .flatMap((x): DraftFixture[] => (isObj(x) && READER_FIXTURES.includes(x.type as FixtureType) ? [{ type: x.type as FixtureType, at: pt(x.at) }] : []));
  return { name: cleanName(r.name), type, outline: outline && clockwise(outline.map(([x, y]) => [Math.round(x), Math.round(y)])), fixtures };
}

/** Moves a Floor so its drawn corners start at 0,0 (stored outlines are never negative). */
function shiftToOrigin(floor: DraftFloor): DraftFloor {
  const xs: number[] = [];
  const ys: number[] = [];
  floor.rooms.forEach((r) => r.outline?.forEach(([x, y]) => (xs.push(x), ys.push(y))));
  if (!xs.length) return floor;
  const dx = Math.min(...xs);
  const dy = Math.min(...ys);
  const move = ([x, y]: [number, number]): [number, number] => [Math.max(0, Math.round(x - dx)), Math.max(0, Math.round(y - dy))];
  return {
    name: floor.name,
    rooms: floor.rooms.map((r) => ({ ...r, outline: r.outline && r.outline.map(move), fixtures: r.fixtures.map((f) => ({ ...f, at: f.at && move(f.at) })) })),
    openings: floor.openings.map((o) => ({ ...o, at: move(o.at) })),
  };
}
