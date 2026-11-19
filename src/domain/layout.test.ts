import { describe, expect, it } from "vitest";
import { layoutFloor, type FloorRoom } from "./layout";

const room = (id: string, type: FloorRoom["type"], outline: FloorRoom["outline"] = null): FloorRoom => ({ id, type, outline });

const box = (poly: [number, number][]) => {
  const xs = poly.map((p) => p[0]);
  const ys = poly.map((p) => p[1]);
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
};
const overlap = (a: ReturnType<typeof box>, b: ReturnType<typeof box>) =>
  Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)) * Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));
const area = (b: ReturnType<typeof box>) => (b.x1 - b.x0) * (b.y1 - b.y0);

describe("laying out Rooms without an outline", () => {
  const flat = [room("lk", "living"), room("hall", "hall"), room("bath", "bathroom"), room("bed", "bedroom"), room("kids", "kids"), room("ter", "terrace")];

  it("places every Room once, none overlapping, together a believable flat", () => {
    const { rooms, width, depth } = layoutFloor(flat);
    const boxes = rooms.map((r) => box(r.polygon));

    expect(rooms.map((r) => r.id).sort()).toEqual(flat.map((r) => r.id).sort());
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) expect(overlap(boxes[i], boxes[j])).toBeLessThan(1);
    // 24 + 7 + 5 + 13 + 11 + 12 m² of default sizes
    expect(boxes.reduce((sum, b) => sum + area(b), 0) / 10_000).toBeCloseTo(72, 0);
    expect(width / depth).toBeGreaterThan(0.8);
    expect(width / depth).toBeLessThan(2.2);
  });

  it("makes a living room bigger than a bathroom", () => {
    const { rooms } = layoutFloor(flat);
    const size = (id: string) => area(box(rooms.find((r) => r.id === id)!.polygon));

    expect(size("lk")).toBeGreaterThan(size("bath") * 3);
  });

  it("lays out the same Rooms the same way every time", () => {
    expect(layoutFloor(flat)).toEqual(layoutFloor(flat));
  });

  it("copes with no Rooms and a single Room", () => {
    expect(layoutFloor([]).rooms).toEqual([]);
    expect(layoutFloor([room("a", "bedroom")]).rooms).toHaveLength(1);
  });
});

describe("Rooms with an outline", () => {
  it("keeps drawn outlines as they are and puts the undrawn ones beside them", () => {
    const drawn = room("bath", "bathroom", [
      [0, 0],
      [200, 0],
      [200, 250],
      [0, 250],
    ]);
    const { rooms } = layoutFloor([drawn, room("bed", "bedroom")]);

    expect(rooms.find((r) => r.id === "bath")).toEqual({ id: "bath", polygon: drawn.outline, drawn: true });
    const bed = box(rooms.find((r) => r.id === "bed")!.polygon);
    expect(bed.x0).toBeGreaterThanOrEqual(200);
    expect(rooms.find((r) => r.id === "bed")!.drawn).toBe(false);
  });
});
