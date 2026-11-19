import Link from "next/link";
import type { Home } from "@/server/home";
import type { Lang } from "@/i18n/config";
import { DICT } from "@/i18n/dictionary";
import type { RoomType } from "@/server/home-types";

/** Each kind of room keeps its own candy colour, the same one it has on the Home map (see room-colours.ts). */
const ROOM_COLOUR: Record<RoomType, string> = {
  kitchen: "bg-room-2", living: "bg-room-1", dining: "bg-room-2", bedroom: "bg-room-3", kids: "bg-room-4",
  bathroom: "bg-room-5", toilet: "bg-room-5", hall: "bg-room-2", laundry: "bg-room-5", office: "bg-room-1",
  storage: "bg-raised", terrace: "bg-terrace", other: "bg-raised",
};

/** A simple 2D view of the home: each Floor with its Rooms as tiles, until the 3D Home map arrives. */
export function RoomTiles({ home, lang }: { home: Home; lang: Lang }) {
  const t = DICT[lang].rooms;
  return (
    <div className="flex flex-col gap-5">
      {home.floors.map((floor, i) => (
        <section key={floor.id} aria-labelledby={`floor-${floor.id}`} className="flex flex-col gap-2">
          {home.floors.length > 1 && (
            <h2 id={`floor-${floor.id}`} className="text-[17px] text-ink">
              {floor.name ?? t.floorN(i + 1)}
            </h2>
          )}
          {floor.rooms.length === 0 ? (
            <p className="rounded-card border-2 border-dashed border-line p-4 text-[14px] text-ink-2">
              {home.canEdit ? t.noRoomsOwner : t.noRooms}
            </p>
          ) : (
            <ul className="grid grid-cols-2 gap-2">
              {floor.rooms.map((room) => {
                const body = (
                  <>
                    <span className="font-display text-[17px] font-extrabold leading-tight">{room.name}</span>
                    <span className="text-[12px] font-semibold text-ink">
                      {room.name !== t.roomTypes[room.type] ? `${t.roomTypes[room.type]}, ` : ""}
                      {t.fixturesCount(room.fixtures.length)}
                    </span>
                  </>
                );
                const tile = `flex min-h-20 flex-col justify-between rounded-card border-2 border-edge p-3 ${ROOM_COLOUR[room.type]}`;
                return (
                  <li key={room.id}>
                    {/* The Owner reopens a Room's suggested chores from its tile. */}
                    {home.canEdit ? (
                      <Link href={`/setup/${room.id}`} aria-label={`${room.name}: ${DICT[lang].setup.suggestionsFor}`} className={`${tile} h-full`}>
                        {body}
                      </Link>
                    ) : (
                      <div className={`${tile} h-full`}>{body}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
