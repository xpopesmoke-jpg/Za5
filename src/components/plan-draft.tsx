"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { mapFloor } from "@/domain/map";
import type { DraftHome } from "@/domain/plan";
import { useT } from "@/i18n/client";

const HomeMap3D = dynamic(() => import("./home-map-3d").then((m) => m.HomeMap3D), {
  ssr: false,
  loading: () => <div className="h-[300px] w-full animate-pulse bg-raised" />,
});

const chip = (on: boolean) =>
  `flex min-h-11 shrink-0 items-center rounded-full border-2 px-3.5 text-[14px] font-extrabold ${on ? "border-edge bg-ink text-surface" : "border-line bg-surface text-ink"}`;

/**
 * What Claude read, beside the Plan it came from: one page at a time, the original above and Za5's 3D drawing
 * below, with the Rooms it found. Tap a Room to see it on the drawing.
 */
export function PlanDraft({ draft, version }: { draft: DraftHome; version: string }) {
  const t = useT();
  const [page, setPage] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [no3d, setNo3d] = useState(false);
  const floors = useMemo(
    () =>
      draft.floors.map((f, i) =>
        mapFloor({
          id: `page-${i}`,
          name: f.name,
          openings: f.openings,
          rooms: f.rooms.map((r, j) => ({ id: `page-${i}-room-${j}`, name: r.name || t.rooms.roomTypes[r.type], type: r.type, outline: r.outline, fixtures: r.fixtures })),
        }),
      ),
    [draft, t],
  );
  const floor = floors[page];

  return (
    <section className="flex flex-col gap-3">
      {floors.length > 1 && (
        <div role="group" aria-label={t.home.floors} className="flex gap-2 overflow-x-auto">
          {floors.map((f, i) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={i === page}
              onClick={() => {
                setPage(i);
                setPicked(null);
              }}
              className={chip(i === page)}
            >
              {f.name ?? t.rooms.floorN(i + 1)}
            </button>
          ))}
        </div>
      )}
      <figure className="flex flex-col gap-1">
        <figcaption className="text-[14px] font-bold text-ink-2">{t.plan.original}</figcaption>
        {/* eslint-disable-next-line @next/next/no-img-element -- a private, signed-in image from our own route */}
        <img src={`/api/plan/page/${page + 1}?v=${version}`} alt={t.plan.pageAlt(page + 1)} className="max-h-[360px] w-full rounded-card border-2 border-line bg-white object-contain" />
      </figure>
      <figure className="flex flex-col gap-1">
        <figcaption className="text-[14px] font-bold text-ink-2">
          {t.plan.drawn}: {t.plan.roomCount(floor.rooms.length)}
        </figcaption>
        {floor.rooms.length === 0 ? (
          <p className="rounded-card border-2 border-line bg-raised p-4 text-[15px]">{t.plan.notAPlan}</p>
        ) : (
          <div className="overflow-hidden rounded-card border-2 border-edge bg-surface">
            {!no3d && (
              <HomeMap3D
                key={floor.id}
                rooms={floor.rooms}
                openings={floor.openings}
                selected={picked}
                onPick={(id) => setPicked((p) => (id && id !== p ? id : null))}
                onUnavailable={() => setNo3d(true)}
                label={`${t.plan.drawn}: ${floor.rooms.map((r) => r.name).join(", ")}`}
              />
            )}
          </div>
        )}
      </figure>
      {floor.rooms.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label={t.plan.roomCount(floor.rooms.length)}>
          {floor.rooms.map((r) => (
            <li key={r.id}>
              <button type="button" aria-pressed={picked === r.id} onClick={() => setPicked((p) => (p === r.id ? null : r.id))} className={`${chip(picked === r.id)} flex-col items-start justify-center py-1`}>
                <span>{r.name}</span>
                {r.fixtures.length > 0 && <span className="text-[12px] font-semibold opacity-75">{r.fixtures.map((f) => t.rooms.fixtureTypes[f.type]).join(", ")}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
