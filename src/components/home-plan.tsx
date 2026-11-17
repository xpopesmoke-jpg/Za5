import type { Home } from "@/server/home";
import type { Lang } from "@/i18n/config";
import { DICT } from "@/i18n/dictionary";

/** A simple 2D view of the home: each Floor with its Rooms as tiles. The 3D Home map replaces it later. */
export function HomePlan({ home, lang }: { home: Home; lang: Lang }) {
  const t = DICT[lang].rooms;
  return (
    <div className="flex flex-col gap-5">
      {home.floors.map((floor, i) => (
        <section key={floor.id} aria-labelledby={`floor-${floor.id}`} className="flex flex-col gap-2">
          {home.floors.length > 1 && (
            <h2 id={`floor-${floor.id}`} className="text-[13px] font-semibold uppercase tracking-wide text-ink-2">
              {floor.name ?? t.floorN(i + 1)}
            </h2>
          )}
          {floor.rooms.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-line p-4 text-[14px] text-ink-2">
              {home.canEdit ? t.noRoomsOwner : t.noRooms}
            </p>
          ) : (
            <ul className="grid grid-cols-2 gap-2">
              {floor.rooms.map((room) => (
                <li key={room.id} className="flex min-h-20 flex-col justify-between rounded-2xl border border-line bg-surface p-3">
                  <span className="text-[15px] font-semibold leading-tight">{room.name}</span>
                  <span className="text-[12px] text-ink-2">
                    {room.name !== t.roomTypes[room.type] ? `${t.roomTypes[room.type]} · ` : ""}
                    {t.fixturesCount(room.fixtures.length)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
