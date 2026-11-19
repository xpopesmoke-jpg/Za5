import type { RoomType } from "@/server/home-types";

/** A Room's outline: its corners on the Floor in centimetres, x to the right and y down, clockwise. */
export type Outline = [number, number][];

/**
 * Twice the signed area of an outline (shoelace). With y pointing down, a positive value means the corners go
 * clockwise on screen.
 */
export function signedArea2(poly: Outline): number {
  let a = 0;
  poly.forEach(([x1, y1], i) => {
    const [x2, y2] = poly[(i + 1) % poly.length];
    a += x1 * y2 - x2 * y1;
  });
  return a;
}

/** The same outline, with its corners clockwise on screen. */
export const clockwise = (poly: Outline): Outline => (signedArea2(poly) < 0 ? [...poly].reverse() : poly);

/** Whether a point lies inside an outline (ray casting). */
export function contains(poly: Outline, [x, y]: [number, number]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** A Room as the Home map needs it: its type and, if drawn, its outline in centimetres. */
export type FloorRoom = { id: string; type: RoomType; outline: Outline | null };
export type LaidOutRoom = { id: string; polygon: Outline; drawn: boolean };

/** Typical floor areas in m², used to size Rooms that have no outline yet. */
const TYPICAL_M2: Record<RoomType, number> = {
  living: 24, kitchen: 10, dining: 12, bedroom: 13, kids: 11, bathroom: 5, toilet: 2.5,
  hall: 7, laundry: 4, office: 9, storage: 3, terrace: 12, other: 8,
};

/** Gap between drawn Rooms and the ones laid out beside them, in cm. */
const GAP = 80;
/** Width to depth of the block of laid-out Rooms: a bit wider than deep, like most flats. */
const ASPECT = 1.35;

type Rect = { x: number; y: number; w: number; d: number };

const rectPolygon = (r: Rect): [number, number][] => [
  [r.x, r.y],
  [r.x + r.w, r.y],
  [r.x + r.w, r.y + r.d],
  [r.x, r.y + r.d],
];

/**
 * Squarified treemap: fills `into` with one rectangle per area (cm²), keeping each as close to square as it can,
 * which reads as rooms rather than corridors.
 */
function squarify(areas: number[], into: Rect): Rect[] {
  const out: Rect[] = [];
  let rest = { ...into };
  let i = 0;
  while (i < areas.length) {
    const short = Math.min(rest.w, rest.d);
    const worst = (row: number[]) => {
      const sum = row.reduce((a, b) => a + b, 0);
      const side = sum / short;
      return Math.max(...row.map((a) => Math.max((side * side) / a, a / (side * side))));
    };
    let row = [areas[i]];
    while (i + row.length < areas.length && worst([...row, areas[i + row.length]]) <= worst(row)) row = [...row, areas[i + row.length]];
    const sum = row.reduce((a, b) => a + b, 0);
    if (rest.w >= rest.d) {
      // a column down the left of what is left
      const colW = sum / rest.d;
      let y = rest.y;
      for (const a of row) {
        const d = a / colW;
        out.push({ x: rest.x, y, w: colW, d });
        y += d;
      }
      rest = { x: rest.x + colW, y: rest.y, w: rest.w - colW, d: rest.d };
    } else {
      // a row across the top of what is left
      const rowD = sum / rest.w;
      let x = rest.x;
      for (const a of row) {
        const w = a / rowD;
        out.push({ x, y: rest.y, w, d: rowD });
        x += w;
      }
      rest = { x: rest.x, y: rest.y + rowD, w: rest.w, d: rest.d - rowD };
    }
    i += row.length;
  }
  return out;
}

const round = (r: Rect): Rect => ({ x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.w), d: Math.round(r.d) });

/**
 * Where each Room of a Floor sits on the Home map. Rooms with an outline keep it; the rest are sized by their
 * type and packed into a tidy block beside the drawn ones (or on their own), the same way every time.
 */
export function layoutFloor(rooms: FloorRoom[]): { rooms: LaidOutRoom[]; width: number; depth: number } {
  const drawn = rooms.filter((r) => r.outline && r.outline.length >= 3);
  const undrawn = rooms.filter((r) => !r.outline || r.outline.length < 3);
  const pts = drawn.flatMap((r) => r.outline!);
  const maxX = pts.length ? Math.max(...pts.map((p) => p[0])) : 0;
  const minY = pts.length ? Math.min(...pts.map((p) => p[1])) : 0;

  // Biggest first, ties by id, so the same Rooms always land the same way.
  const sized = undrawn
    .map((r) => ({ r, area: TYPICAL_M2[r.type] * 10_000 }))
    .sort((a, b) => b.area - a.area || a.r.id.localeCompare(b.r.id));
  const total = sized.reduce((s, x) => s + x.area, 0);
  const w = Math.sqrt(total * ASPECT);
  const block: Rect = { x: pts.length ? maxX + GAP : 0, y: minY, w, d: total / (w || 1) };
  const rects = sized.length ? squarify(sized.map((x) => x.area), block).map(round) : [];

  const laid: LaidOutRoom[] = [
    ...drawn.map((r) => ({ id: r.id, polygon: r.outline!, drawn: true })),
    ...sized.map((x, i) => ({ id: x.r.id, polygon: rectPolygon(rects[i]), drawn: false })),
  ];
  const all = laid.flatMap((r) => r.polygon);
  const width = all.length ? Math.max(...all.map((p) => p[0])) - Math.min(...all.map((p) => p[0])) : 0;
  const depth = all.length ? Math.max(...all.map((p) => p[1])) - Math.min(...all.map((p) => p[1])) : 0;
  return { rooms: laid, width, depth };
}
