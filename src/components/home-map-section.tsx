"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import type { HomeMap } from "@/server/home-map";
import { useT } from "@/i18n/client";

// three.js is browser only and heavy: load the map on the client, after the page itself.
const HomeMap3D = dynamic(() => import("./home-map-3d").then((m) => m.HomeMap3D), {
  ssr: false,
  loading: () => <div className="h-[300px] w-full animate-pulse rounded-card bg-raised" />,
});

/** What Today's list shows: everything, one Room, or the Whole home. */
type Filter = { kind: "all" } | { kind: "room"; id: string } | { kind: "whole" };

const chip = (on: boolean) =>
  `flex min-h-11 shrink-0 items-center gap-2 rounded-full border-2 px-3.5 text-[14px] font-extrabold ${on ? "border-edge bg-ink text-surface" : "border-line bg-surface text-ink"}`;

/**
 * The top of the main screen: the 3D Home map with a Floor switcher, and a row of Room chips (the same choice
 * as tapping the map, reachable without it). Picking a Room zooms the map in and filters Today's list, which
 * comes in as `children` and marks each item with data-place (a Room id, "whole" or "needs-room").
 */
export function HomeMapSection({ map, children }: { map: HomeMap; children: ReactNode }) {
  const t = useT();
  const [floorIndex, setFloorIndex] = useState(0);
  const [filter, setFilter] = useState<Filter>({ kind: "all" });
  const floor = map.floors[Math.min(floorIndex, map.floors.length - 1)];
  const rooms = useMemo(() => floor?.rooms ?? [], [floor]);
  const selectedRoom = filter.kind === "room" ? rooms.find((r) => r.id === filter.id) : undefined;

  const onPick = useCallback((id: string | null) => setFilter((f) => (id && !(f.kind === "room" && f.id === id) ? { kind: "room", id } : { kind: "all" })), []);
  const showing = filter.kind === "room" ? selectedRoom?.name : filter.kind === "whole" ? t.chores.wholeHome : null;
  const place = filter.kind === "room" ? filter.id : filter.kind === "whole" ? "whole" : null;
  const totalDue = map.floors.reduce((s, f) => s + f.rooms.reduce((a, r) => a + r.due, 0), 0) + map.wholeHome.due;

  return (
    <>
      <section aria-label={t.home.mapLabel} className="flex flex-col gap-2">
        {map.floors.length > 1 && (
          <div role="group" aria-label={t.home.floors} className="flex gap-2 overflow-x-auto">
            {map.floors.map((f, i) => (
              <button
                key={f.id}
                type="button"
                aria-pressed={i === floorIndex}
                onClick={() => {
                  setFloorIndex(i);
                  setFilter({ kind: "all" });
                }}
                className={chip(i === floorIndex)}
              >
                {f.name ?? t.rooms.floorN(i + 1)}
              </button>
            ))}
          </div>
        )}
        <div className="relative overflow-hidden rounded-card border-2 border-edge bg-surface">
          {rooms.length > 0 ? (
            <HomeMap3D rooms={rooms} selected={filter.kind === "room" ? filter.id : null} onPick={onPick} label={t.home.mapSummary(rooms.length, totalDue)} />
          ) : (
            <p className="p-6 text-[14px] text-ink-2">{t.rooms.noRooms}</p>
          )}
          {map.wholeHome.due > 0 && (
            <button
              type="button"
              onClick={() => setFilter((f) => (f.kind === "whole" ? { kind: "all" } : { kind: "whole" }))}
              aria-pressed={filter.kind === "whole"}
              className={`absolute right-3 top-3 flex min-h-11 items-center gap-2 rounded-full border-2 border-edge px-3 text-[13px] font-extrabold ${map.wholeHome.overdue ? "bg-accent text-accent-ink" : "bg-za5 text-za5-ink"}`}
            >
              {t.chores.wholeHome}
              <span className="font-display text-[15px]">{map.wholeHome.due}</span>
            </button>
          )}
        </div>
        <div role="group" aria-label={t.home.pickRoom} className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
          {rooms.map((r) => (
            <button key={r.id} type="button" aria-pressed={filter.kind === "room" && filter.id === r.id} onClick={() => onPick(r.id)} className={chip(filter.kind === "room" && filter.id === r.id)}>
              {r.overdue > 0 && <span className="size-2.5 rounded-full bg-accent" aria-hidden="true" />}
              {r.name}
              {r.due > 0 && <span className="font-display">{r.due}</span>}
            </button>
          ))}
        </div>
      </section>
      <div data-filter={place ?? undefined} className="flex flex-col gap-3">
        {place && (
          <>
            <style>{`[data-filter="${place}"] li[data-place]:not([data-place="${place}"]){display:none}`}</style>
            <p className="flex items-center justify-between gap-3 rounded-2xl bg-raised px-3 py-2 text-[14px] font-bold">
              <span>{t.home.showing(showing ?? "")}</span>
              <button type="button" onClick={() => setFilter({ kind: "all" })} className="min-h-9 text-ink-2 underline">
                {t.home.showAll}
              </button>
            </p>
          </>
        )}
        {children}
      </div>
    </>
  );
}
