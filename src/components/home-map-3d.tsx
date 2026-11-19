"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { contains, type Outline } from "@/domain/layout";
import type { FixtureType, RoomType } from "@/server/home-types";
import type { MapRoom } from "@/server/home-map";
import { ROOM_TOKEN } from "./room-colours";

/*
 * The 3D Home map: a dollhouse of one Floor. Walls rise from each Room's outline, no roof, the walls facing the
 * camera stay low so the rooms can be seen into, and a dark edge gives the Dollhouse look.
 *
 * The scene is built once per layout (Rooms, outlines, Fixtures); what changes with the day (overdue) is updated
 * in place, so marking a chore Done doesn't rebuild WebGL. It draws only when something changes; the glow of
 * overdue Rooms is the one animation, and it stops off screen, in a hidden tab and for reduced motion.
 */

const CM = 1 / 100; // scene units are metres
const WALL_H = 0.95;
const LOW_WALL_H = 0.22;
const WALL_T = 0.09;
// The camera looks from the front-left, a little above: a 3/4 dollhouse view.
const VIEW = new THREE.Vector3(-0.85, 1.25, 1.35).normalize();
const GLOW_FPS = 30;

type Shape3 = { w: number; d: number; h: number; colour: string };

/** Simple stand-ins for Fixtures: footprint (m), height (m), colour. */
const FIXTURE_SHAPE: Partial<Record<FixtureType, Shape3>> = {
  shower: { w: 0.8, d: 0.8, h: 0.08, colour: "#bfe7f5" },
  bathtub: { w: 1.6, d: 0.7, h: 0.5, colour: "#ffffff" },
  toilet: { w: 0.4, d: 0.6, h: 0.4, colour: "#ffffff" },
  sink: { w: 0.6, d: 0.45, h: 0.85, colour: "#ffffff" },
  oven: { w: 0.6, d: 0.6, h: 0.9, colour: "#f4c98b" },
  hob: { w: 0.6, d: 0.6, h: 0.9, colour: "#f4c98b" },
  dishwasher: { w: 0.6, d: 0.6, h: 0.9, colour: "#f4c98b" },
  counter: { w: 1.2, d: 0.6, h: 0.9, colour: "#f4c98b" },
  fridge: { w: 0.6, d: 0.65, h: 1.8, colour: "#ffffff" },
  washing_machine: { w: 0.6, d: 0.6, h: 0.85, colour: "#ffffff" },
  dryer: { w: 0.6, d: 0.6, h: 0.85, colour: "#ffffff" },
};

/** A piece or two of furniture per kind of room, so it reads as a home. */
const FURNITURE: Partial<Record<RoomType, Shape3[]>> = {
  bedroom: [{ w: 1.6, d: 2.0, h: 0.45, colour: "#ffb3c7" }],
  kids: [{ w: 0.9, d: 2.0, h: 0.45, colour: "#9ae6c8" }],
  living: [
    { w: 2.2, d: 0.9, h: 0.45, colour: "#7aa7ff" },
    { w: 1.0, d: 0.6, h: 0.35, colour: "#f4c98b" },
  ],
  dining: [{ w: 1.2, d: 1.2, h: 0.75, colour: "#f4c98b" }],
  office: [{ w: 1.4, d: 0.7, h: 0.75, colour: "#f4c98b" }],
  terrace: [
    { w: 0.45, d: 0.45, h: 0.5, colour: "#7fd18b" },
    { w: 1.2, d: 0.8, h: 0.4, colour: "#f4c98b" },
  ],
  hall: [{ w: 1.6, d: 0.5, h: 1.6, colour: "#c9b6ff" }],
};

export type HomeMap3DProps = {
  rooms: MapRoom[];
  selected: string | null;
  onPick: (roomId: string | null) => void;
  /** Called when this device can't draw 3D, so the page keeps only the Room chips */
  onUnavailable: () => void;
  label: string;
};

const tokenColour = (name: string) => {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return new THREE.Color(v || "#dddddd");
};

/** Shared materials, one per colour, so a home is a handful of materials rather than one per box. */
function materials() {
  const fills = new Map<string, THREE.MeshLambertMaterial>();
  return {
    edge: new THREE.LineBasicMaterial({ color: tokenColour("--edge") }),
    fill(c: string) {
      let m = fills.get(c);
      if (!m) fills.set(c, (m = new THREE.MeshLambertMaterial({ color: new THREE.Color(c) })));
      return m;
    },
    wallA: `#${tokenColour("--wall-a").getHexString()}`,
    wallB: `#${tokenColour("--wall-b").getHexString()}`,
    overdue: tokenColour("--overdue"),
  };
}
type Materials = ReturnType<typeof materials>;

function box(w: number, h: number, d: number, fill: THREE.Material, edge: THREE.LineBasicMaterial) {
  const g = new THREE.BoxGeometry(w, h, d);
  const mesh = new THREE.Mesh(g, fill);
  mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(g), edge));
  return mesh;
}

/** Whether a w×d footprint centred at (x, z) metres lies inside the outline (cm): its corners and its centre. */
const fitsIn = (poly: Outline, x: number, z: number, w: number, d: number) =>
  [
    [x - w / 2, z - d / 2],
    [x + w / 2, z - d / 2],
    [x + w / 2, z + d / 2],
    [x - w / 2, z + d / 2],
    [x, z],
  ].every(([px, pz]) => contains(poly, [px / CM, pz / CM]));

/** One Room: its floor (kept for picking and colour), walls, and the furniture and Fixtures that fit inside it. */
function buildRoom(room: MapRoom, mats: Materials) {
  const group = new THREE.Group();
  const base = tokenColour(ROOM_TOKEN[room.type]);
  const floorGeo = new THREE.ShapeGeometry(new THREE.Shape(room.polygon.map(([x, y]) => new THREE.Vector2(x * CM, -y * CM))));
  floorGeo.rotateX(-Math.PI / 2);
  // each floor has its own material: its colour and glow change with the day
  const floor = new THREE.Mesh(floorGeo, new THREE.MeshLambertMaterial({ color: base.clone(), emissive: mats.overdue, emissiveIntensity: 0 }));
  floor.userData.roomId = room.id;
  const outline = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(room.polygon.map(([x, y]) => new THREE.Vector3(x * CM, 0.002, y * CM))), mats.edge);
  group.add(floor, outline);

  // Outlines are stored clockwise (y down), so each edge's outward side is (dy, -dx), for L-shaped rooms too.
  const toCamera = new THREE.Vector2(VIEW.x, VIEW.z).normalize();
  if (room.type !== "terrace") {
    room.polygon.forEach(([x1, y1], i) => {
      const [x2, y2] = room.polygon[(i + 1) % room.polygon.length];
      const len = Math.hypot(x2 - x1, y2 - y1) * CM;
      if (len < 0.05) return;
      const n = new THREE.Vector2(y2 - y1, -(x2 - x1)).normalize();
      const h = n.dot(toCamera) > 0.2 ? LOW_WALL_H : WALL_H;
      const wall = box(len + WALL_T, h, WALL_T, mats.fill(Math.abs(n.x) > Math.abs(n.y) ? mats.wallB : mats.wallA), mats.edge);
      // pulled in by half a wall, so neighbouring Rooms' walls sit side by side
      wall.position.set(((x1 + x2) / 2) * CM - (n.x * WALL_T) / 2, h / 2, ((y1 + y2) / 2) * CM - (n.y * WALL_T) / 2);
      wall.rotation.y = -Math.atan2(y2 - y1, x2 - x1);
      group.add(wall);
    });
  }

  const xs = room.polygon.map((p) => p[0] * CM);
  const zs = room.polygon.map((p) => p[1] * CM);
  const [minX, maxX, minZ, maxZ] = [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)];
  // Fixtures have no saved position yet: rows from the back corner, each kept only where it lies inside the Room.
  let fx = minX + 0.2;
  let fz = minZ + 0.2;
  for (const f of room.fixtures) {
    const s = FIXTURE_SHAPE[f];
    if (!s) continue;
    while (fz + s.d <= maxZ - 0.1) {
      if (fx + s.w > maxX - 0.1) {
        fx = minX + 0.2;
        fz += 0.85;
        continue;
      }
      const cx = fx + s.w / 2;
      const cz = fz + s.d / 2;
      fx += s.w + 0.1;
      if (fitsIn(room.polygon, cx, cz, s.w + 0.1, s.d + 0.1)) {
        const m = box(s.w, s.h, s.d, mats.fill(s.colour), mats.edge);
        m.position.set(cx, s.h / 2, cz);
        group.add(m);
        break;
      }
    }
  }
  // Furniture around the middle, only where it fits inside the outline.
  const midX = (minX + maxX) / 2;
  const midZ = (minZ + maxZ) / 2;
  (FURNITURE[room.type] ?? []).forEach((f, i) => {
    const cx = midX + (i ? 0.2 : -0.1);
    const cz = midZ + i * (f.d + 0.25) - 0.1;
    if (!fitsIn(room.polygon, cx, cz, f.w + 0.2, f.d + 0.2)) return;
    const m = box(f.w, f.h, f.d, mats.fill(f.colour), mats.edge);
    m.position.set(cx, f.h / 2, cz);
    group.add(m);
  });
  return { group, floor, base, centre: new THREE.Vector3(midX, 0, midZ), size: Math.max(maxX - minX, maxZ - minZ) };
}

type SceneControls = {
  setStatus: (rooms: MapRoom[]) => void;
  focus: (id: string | null) => void;
};

/**
 * Draws one Floor of the home; tapping a Room picks it (tap it again, or empty floor, to let go). Badges with
 * each Room's count sit over the canvas, positioned from the 3D centres.
 */
export function HomeMap3D({ rooms, selected, onPick, onUnavailable, label }: HomeMap3DProps) {
  const host = useRef<HTMLDivElement>(null);
  const badges = useRef<HTMLDivElement>(null);
  const controls = useRef<SceneControls | null>(null);
  const latest = useRef({ rooms, selected, onPick, onUnavailable });
  useEffect(() => {
    latest.current = { rooms, selected, onPick, onUnavailable };
  });
  // Only a change in the layout itself rebuilds the scene; a refreshed page with the same rooms does not.
  const layoutKey = useMemo(() => JSON.stringify(rooms.map((r) => [r.id, r.type, r.polygon, r.fixtures])), [rooms]);

  useEffect(() => {
    const el = host.current!;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      latest.current.onUnavailable();
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    const canvas = renderer.domElement;
    canvas.style.display = "block";
    canvas.style.touchAction = "manipulation";
    el.appendChild(canvas);

    const world = new THREE.Scene();
    world.add(new THREE.HemisphereLight(0xffffff, 0xb9b0d0, 1.6));
    const sun = new THREE.DirectionalLight(0xffffff, 1.3);
    sun.position.set(-4, 9, 6);
    world.add(sun);

    const mats = materials();
    const built = latest.current.rooms.map((r) => ({ id: r.id, ...buildRoom(r, mats) }));
    built.forEach((b) => world.add(b.group));
    const bounds = new THREE.Box3();
    built.forEach((b) => bounds.expandByObject(b.group));
    const centre = bounds.isEmpty() ? new THREE.Vector3() : bounds.getCenter(new THREE.Vector3());
    const span = bounds.isEmpty() ? 4 : Math.max(bounds.max.x - bounds.min.x, bounds.max.z - bounds.min.z);

    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -100, 100);
    const view = { target: centre.clone(), zoom: 1 };
    const goal = { target: centre.clone(), zoom: 1 };
    let size = { w: 1, h: 1 };
    const resize = () => {
      size = { w: Math.max(1, el.clientWidth), h: Math.max(1, el.clientHeight) };
      renderer.setSize(size.w, size.h);
      const half = span * 0.62;
      const aspect = size.w / size.h;
      camera.left = -half * aspect;
      camera.right = half * aspect;
      camera.top = half;
      camera.bottom = -half;
    };
    const aim = () => {
      camera.zoom = view.zoom;
      camera.position.copy(view.target).addScaledVector(VIEW, 20);
      camera.lookAt(view.target);
      camera.updateProjectionMatrix();
    };
    const placeBadges = () => {
      const layer = badges.current;
      if (!layer) return;
      for (const b of built) {
        const tag = layer.querySelector<HTMLElement>(`[data-room="${b.id}"]`);
        if (!tag) continue;
        const p = b.centre.clone().setY(WALL_H + 0.25).project(camera);
        tag.style.transform = `translate(${((p.x + 1) / 2) * size.w}px, ${((1 - p.y) / 2) * size.h}px) translate(-50%, -50%)`;
      }
    };

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let glowing: typeof built = [];
    let frameId = 0;
    let glowTimer = 0;
    let onScreen = true;
    const frame = (t: number) => {
      frameId = 0;
      view.target.lerp(goal.target, 0.18);
      view.zoom += (goal.zoom - view.zoom) * 0.18;
      const moving = view.target.distanceTo(goal.target) > 0.002 || Math.abs(goal.zoom - view.zoom) > 0.002;
      for (const b of glowing) {
        (b.floor.material as THREE.MeshLambertMaterial).emissiveIntensity = reduceMotion ? 0.25 : 0.18 + 0.18 * Math.sin(t / 420);
      }
      aim();
      renderer.render(world, camera);
      placeBadges();
      // Keep drawing while the camera moves, and at about 30 fps while something glows on screen.
      if (moving) frameId = requestAnimationFrame(frame);
      else if (glowing.length && !reduceMotion && onScreen && !document.hidden) glowTimer = window.setTimeout(draw, 1000 / GLOW_FPS);
    };
    function draw() {
      clearTimeout(glowTimer);
      glowTimer = 0;
      if (!frameId) frameId = requestAnimationFrame(frame);
    }

    controls.current = {
      setStatus(now) {
        const late = new Set(now.filter((r) => r.overdue > 0).map((r) => r.id));
        glowing = built.filter((b) => late.has(b.id));
        for (const b of built) {
          const mat = b.floor.material as THREE.MeshLambertMaterial;
          // overdue: the Room's own colour turned towards coral, with a soft pulse on top
          mat.color.copy(b.base);
          if (late.has(b.id)) mat.color.lerp(mats.overdue, 0.55);
          mat.emissiveIntensity = 0;
        }
        draw();
      },
      focus(id) {
        const b = built.find((x) => x.id === id);
        goal.target.copy(b ? b.centre : centre);
        goal.zoom = b ? Math.min(2, Math.max(1.15, (span / Math.max(b.size, 1.5)) * 0.6)) : 1;
        draw();
      },
    };

    // Tap: the Room under the finger, or none. A drag (scrolling the page) is not a tap.
    const ray = new THREE.Raycaster();
    const floors = built.map((b) => b.floor);
    let downAt: { x: number; y: number } | null = null;
    const down = (e: PointerEvent) => (downAt = { x: e.clientX, y: e.clientY });
    const cancel = () => (downAt = null);
    const up = (e: PointerEvent) => {
      const start = downAt;
      downAt = null;
      if (!start || Math.hypot(e.clientX - start.x, e.clientY - start.y) > 8) return;
      const r = canvas.getBoundingClientRect();
      ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
      latest.current.onPick((ray.intersectObjects(floors, false)[0]?.object.userData.roomId as string | undefined) ?? null);
    };
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", cancel);
    // A phone can drop the WebGL context while in the background; draw again once it is back.
    const lost = (e: Event) => e.preventDefault();
    canvas.addEventListener("webglcontextlost", lost);
    canvas.addEventListener("webglcontextrestored", draw);

    const sizes = new ResizeObserver(() => {
      resize();
      draw();
    });
    sizes.observe(el);
    const seen = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      if (onScreen) draw();
    });
    seen.observe(el);
    const onVisibility = () => !document.hidden && draw();
    document.addEventListener("visibilitychange", onVisibility);
    resize();
    controls.current.setStatus(latest.current.rooms);
    controls.current.focus(latest.current.selected);

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(glowTimer);
      sizes.disconnect();
      seen.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", cancel);
      canvas.removeEventListener("webglcontextlost", lost);
      canvas.removeEventListener("webglcontextrestored", draw);
      const used = new Set<THREE.Material>();
      world.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        if (m.material) (Array.isArray(m.material) ? m.material : [m.material]).forEach((x) => used.add(x));
      });
      used.forEach((x) => x.dispose());
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
      controls.current = null;
    };
  }, [layoutKey]);

  // The day's changes update the scene in place.
  useEffect(() => controls.current?.setStatus(rooms), [rooms]);
  useEffect(() => controls.current?.focus(selected), [selected, layoutKey]);

  return (
    <div className="relative h-[300px] w-full overflow-hidden" role="img" aria-label={label}>
      <div ref={host} className="absolute inset-0" />
      <div ref={badges} className="pointer-events-none absolute inset-0" aria-hidden="true">
        {rooms
          .filter((r) => r.due > 0)
          .map((r) => (
            <span
              key={r.id}
              data-room={r.id}
              className={`absolute left-0 top-0 flex size-7 items-center justify-center rounded-full border-2 border-edge font-display text-[14px] font-extrabold ${r.overdue ? "bg-accent text-accent-ink" : "bg-surface text-ink"}`}
            >
              {r.due}
            </span>
          ))}
      </div>
    </div>
  );
}
