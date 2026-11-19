"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { FixtureType, RoomType } from "@/server/home-types";
import type { MapRoom } from "@/server/home-map";
import { ROOM_TOKEN } from "./room-colours";

/*
 * The 3D Home map: a dollhouse of one Floor. Walls rise from each Room's outline, no roof, the walls facing the
 * camera stay low so the rooms can be seen into, and a dark edge gives the Dollhouse look. It draws only when
 * something changes; the glow of overdue Rooms is the one animation, and it stops when off screen, when the
 * tab is hidden, and for reduced motion.
 */

const CM = 1 / 100; // scene units are metres
const WALL_H = 0.95;
const LOW_WALL_H = 0.22;
const WALL_T = 0.09;
// The camera looks from the front-left, a little above: a 3/4 dollhouse view.
const VIEW = new THREE.Vector3(-0.85, 1.25, 1.35).normalize();

/** Simple stand-ins for Fixtures: footprint (m), height (m), and a colour (token or hex). */
const FIXTURE_SHAPE: Partial<Record<FixtureType, { w: number; d: number; h: number; colour: string }>> = {
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

/** A piece or two of furniture per kind of room, so it reads as a home: footprint, height, colour. */
const FURNITURE: Partial<Record<RoomType, { w: number; d: number; h: number; colour: string }[]>> = {
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

export type MapHandle = { rooms: MapRoom[]; selected: string | null; onPick: (roomId: string | null) => void };

const css = (name: string, fallback: string) => {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
};
const colour = (c: string) => new THREE.Color(c.startsWith("--") ? css(c, "#dddddd") : c);

function box(w: number, h: number, d: number, fill: THREE.Color, edge: THREE.Color) {
  const g = new THREE.BoxGeometry(w, h, d);
  const mesh = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color: fill }));
  const lines = new THREE.LineSegments(new THREE.EdgesGeometry(g), new THREE.LineBasicMaterial({ color: edge }));
  mesh.add(lines);
  return mesh;
}

/** The Room's floor plus its walls, and furniture and Fixtures inside; returns the floor mesh for picking and glow. */
function buildRoom(room: MapRoom, edge: THREE.Color, wallA: THREE.Color, wallB: THREE.Color) {
  const group = new THREE.Group();
  const pts = room.polygon.map(([x, y]) => new THREE.Vector2(x * CM, -y * CM));
  const shape = new THREE.Shape(pts);
  const floorGeo = new THREE.ShapeGeometry(shape);
  floorGeo.rotateX(-Math.PI / 2);
  // Overdue Rooms get the coral floor from the design, and a soft pulse on top of it.
  const floorMat = new THREE.MeshLambertMaterial({
    color: colour(room.overdue > 0 ? "--overdue" : ROOM_TOKEN[room.type]),
    emissive: colour("--overdue"),
    emissiveIntensity: 0,
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.userData.roomId = room.id;
  const outline = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(room.polygon.map(([x, y]) => new THREE.Vector3(x * CM, 0.002, y * CM))),
    new THREE.LineBasicMaterial({ color: edge }),
  );
  group.add(floor, outline);

  // Walls along each edge, pulled in by half a wall so neighbouring Rooms' walls sit side by side.
  const cx = room.polygon.reduce((s, p) => s + p[0], 0) / room.polygon.length;
  const cy = room.polygon.reduce((s, p) => s + p[1], 0) / room.polygon.length;
  const toCamera = new THREE.Vector2(VIEW.x, VIEW.z).normalize();
  if (room.type !== "terrace") {
    room.polygon.forEach(([x1, y1], i) => {
      const [x2, y2] = room.polygon[(i + 1) % room.polygon.length];
      const len = Math.hypot(x2 - x1, y2 - y1) * CM;
      if (len < 0.05) return;
      const mx = ((x1 + x2) / 2) * CM;
      const mz = ((y1 + y2) / 2) * CM;
      // outward normal, pointing away from the Room's centre
      let nx = -(y2 - y1);
      let nz = x2 - x1;
      if (nx * ((x1 + x2) / 2 - cx) + nz * ((y1 + y2) / 2 - cy) < 0) [nx, nz] = [-nx, -nz];
      const n = new THREE.Vector2(nx, nz).normalize();
      const front = n.dot(toCamera) > 0.2;
      const h = front ? LOW_WALL_H : WALL_H;
      const wall = box(len + WALL_T, h, WALL_T, Math.abs(n.x) > Math.abs(n.y) ? wallB : wallA, edge);
      wall.position.set(mx - (n.x * WALL_T) / 2, h / 2, mz - (n.y * WALL_T) / 2);
      wall.rotation.y = -Math.atan2(y2 - y1, x2 - x1);
      group.add(wall);
    });
  }

  // Furniture in the middle, Fixtures in a row along the back of the Room.
  const xs = room.polygon.map((p) => p[0] * CM);
  const zs = room.polygon.map((p) => p[1] * CM);
  const [minX, maxX, minZ, maxZ] = [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)];
  const fits = (w: number, d: number) => w < maxX - minX - 0.3 && d < maxZ - minZ - 0.3;
  let fx = minX + 0.2;
  let fz = minZ + 0.2;
  for (const f of room.fixtures) {
    const s = FIXTURE_SHAPE[f];
    if (!s || !fits(s.w, s.d)) continue;
    if (fx + s.w > maxX - 0.15) {
      fx = minX + 0.2;
      fz += 0.85;
    }
    if (fz + s.d > maxZ - 0.15) break;
    const m = box(s.w, s.h, s.d, colour(s.colour), edge);
    m.position.set(fx + s.w / 2, s.h / 2, fz + s.d / 2);
    group.add(m);
    fx += s.w + 0.1;
  }
  (FURNITURE[room.type] ?? []).forEach((f, i) => {
    if (!fits(f.w, f.d)) return;
    const m = box(f.w, f.h, f.d, colour(f.colour), edge);
    m.position.set((minX + maxX) / 2 + (i ? 0.2 : -0.1), f.h / 2, (minZ + maxZ) / 2 + i * (f.d + 0.25) - 0.1);
    group.add(m);
  });
  return { group, floor, centre: new THREE.Vector3((minX + maxX) / 2, 0, (minZ + maxZ) / 2), size: Math.max(maxX - minX, maxZ - minZ) };
}

/**
 * Draws one Floor of the home; tapping a Room picks it (tap it again, or empty floor, to let go). Badges with
 * each Room's count are positioned over the canvas from the 3D centres.
 */
export function HomeMap3D({ rooms, selected, onPick, label }: MapHandle & { label: string }) {
  const host = useRef<HTMLDivElement>(null);
  const badges = useRef<HTMLDivElement>(null);
  const api = useRef<{ focus: (id: string | null) => void } | null>(null);
  const pick = useRef(onPick);
  useEffect(() => {
    pick.current = onPick;
  }, [onPick]);

  useEffect(() => {
    const el = host.current!;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    el.appendChild(renderer.domElement);
    renderer.domElement.style.display = "block";
    renderer.domElement.style.touchAction = "manipulation";

    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xffffff, 0xb9b0d0, 1.6));
    const sun = new THREE.DirectionalLight(0xffffff, 1.3);
    sun.position.set(-4, 9, 6);
    scene.add(sun);

    const edge = colour("--edge");
    const built = rooms.map((r) => ({ room: r, ...buildRoom(r, edge, colour("--wall-a"), colour("--wall-b")) }));
    built.forEach((b) => scene.add(b.group));
    const all = built.length ? built : [];
    const box3 = new THREE.Box3();
    all.forEach((b) => box3.expandByObject(b.group));
    const centre = box3.isEmpty() ? new THREE.Vector3() : box3.getCenter(new THREE.Vector3());
    const span = box3.isEmpty() ? 4 : Math.max(box3.max.x - box3.min.x, box3.max.z - box3.min.z);

    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -100, 100);
    const view = { target: centre.clone(), zoom: 1 };
    const goal = { target: centre.clone(), zoom: 1 };
    const place = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = `${w}px`;
      renderer.domElement.style.height = `${h}px`;
      const half = span * 0.62;
      const aspect = w / h;
      camera.left = -half * aspect;
      camera.right = half * aspect;
      camera.top = half;
      camera.bottom = -half;
      camera.zoom = view.zoom;
      camera.position.copy(view.target).addScaledVector(VIEW, 20);
      camera.lookAt(view.target);
      camera.updateProjectionMatrix();
    };

    // Badges: a count per Room with something due, red when overdue.
    const placeBadges = () => {
      const layer = badges.current;
      if (!layer) return;
      const w = el.clientWidth;
      const h = el.clientHeight;
      for (const b of built) {
        const tag = layer.querySelector<HTMLElement>(`[data-room="${b.room.id}"]`);
        if (!tag) continue;
        const p = b.centre.clone().setY(WALL_H + 0.25).project(camera);
        tag.style.transform = `translate(${((p.x + 1) / 2) * w}px, ${((1 - p.y) / 2) * h}px) translate(-50%, -50%)`;
      }
    };

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let visible = true;
    let last = 0;
    const overdue = built.filter((b) => b.room.overdue > 0);
    const frame = (t: number) => {
      raf = 0;
      // ease the camera towards its goal
      view.target.lerp(goal.target, 0.18);
      view.zoom += (goal.zoom - view.zoom) * 0.18;
      const moving = view.target.distanceTo(goal.target) > 0.002 || Math.abs(goal.zoom - view.zoom) > 0.002;
      const glow = overdue.length > 0 && !reduceMotion && visible && !document.hidden;
      for (const b of overdue) {
        const mat = b.floor.material as THREE.MeshLambertMaterial;
        mat.emissiveIntensity = reduceMotion ? 0.25 : 0.18 + 0.18 * Math.sin(t / 420);
      }
      place();
      renderer.render(scene, camera);
      placeBadges();
      // Keep drawing while the camera moves, and at about 30 fps while something glows.
      if (moving) raf = requestAnimationFrame(frame);
      else if (glow) raf = window.setTimeout(() => (raf = requestAnimationFrame(frame)), Math.max(0, 33 - (t - last))) as unknown as number;
      last = t;
    };
    const draw = () => {
      if (!raf) raf = requestAnimationFrame(frame);
    };

    api.current = {
      focus: (id) => {
        const b = built.find((x) => x.room.id === id);
        goal.target.copy(b ? b.centre : centre);
        goal.zoom = b ? Math.min(2, Math.max(1.15, (span / Math.max(b.size, 1.5)) * 0.6)) : 1;
        draw();
      },
    };

    // Tap: the Room under the finger, or none.
    const ray = new THREE.Raycaster();
    const floors = built.map((b) => b.floor);
    let downAt: { x: number; y: number } | null = null;
    const down = (e: PointerEvent) => (downAt = { x: e.clientX, y: e.clientY });
    const up = (e: PointerEvent) => {
      if (!downAt || Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 8) return;
      const r = renderer.domElement.getBoundingClientRect();
      ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
      const hit = ray.intersectObjects(floors, false)[0];
      pick.current((hit?.object.userData.roomId as string | undefined) ?? null);
    };
    renderer.domElement.addEventListener("pointerdown", down);
    renderer.domElement.addEventListener("pointerup", up);

    const resize = new ResizeObserver(draw);
    resize.observe(el);
    const seen = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) draw();
    });
    seen.observe(el);
    const onVisibility = () => !document.hidden && draw();
    document.addEventListener("visibilitychange", onVisibility);
    draw();

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(raf);
      resize.disconnect();
      seen.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      renderer.domElement.removeEventListener("pointerdown", down);
      renderer.domElement.removeEventListener("pointerup", up);
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
        mats.forEach((x) => x.dispose());
      });
      renderer.dispose();
      renderer.domElement.remove();
      api.current = null;
    };
  }, [rooms]);

  useEffect(() => {
    api.current?.focus(selected);
  }, [selected, rooms]);

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
