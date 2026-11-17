import Link from "next/link";
import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { ActionForm } from "@/components/action-form";
import { ConfirmButton } from "@/components/confirm-button";
import { DICT } from "@/i18n/dictionary";
import { langOf } from "@/i18n/server";
import { getHome } from "@/server/home";
import { FIXTURE_TYPES, ROOM_TYPES } from "@/server/home-types";
import { FLOOR_NAME_MAX, ROOM_NAME_MAX } from "@/domain/limits";
import { getCurrentHome } from "@/server/session";
import {
  addFixtureAction, addFloorAction, addRoomAction, removeFixtureAction, removeFloorAction, removeRoomAction, renameFloorAction, renameRoomAction,
} from "./actions";

const input = "min-h-11 rounded-xl border border-line bg-surface px-3 text-[16px] text-ink";
const small = "min-h-11 rounded-xl border border-line px-4 text-[14px] font-semibold";
function RoomTypeSelect({ value, label, names }: { value: string; label: string; names: Record<string, string> }) {
  return (
    <select name="type" defaultValue={value} aria-label={label} className={`${input} w-36`}>
      {ROOM_TYPES.map((ty) => <option key={ty} value={ty}>{names[ty]}</option>)}
    </select>
  );
}

const primary = "min-h-11 rounded-xl bg-accent px-4 text-[14px] font-semibold text-accent-ink";

/** The Owner's room editor: Floors, Rooms and Fixtures, built from lists (no Plan needed). */
export default async function RoomsPage({ params }: PageProps<"/[lang]/rooms">) {
  const lang = langOf((await params).lang);
  const { me } = await getCurrentHome();
  const home = await getHome(getDb(), me.id);
  if (!home.canEdit) redirect("/");
  const t = DICT[lang].rooms;
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-5 py-8">
      <header className="flex items-center justify-between">
        <h1 className="text-[24px] font-semibold">{t.editRooms}</h1>
        <Link href="/" className="text-[15px] font-semibold text-accent">{t.done}</Link>
      </header>

      {home.floors.map((floor, i) => (
        <section key={floor.id} className="flex flex-col gap-3 rounded-2xl border border-line p-4">
          <ActionForm action={renameFloorAction.bind(null, floor.id)} className="flex flex-col gap-2">
            <label htmlFor={`floor-${floor.id}`} className="text-[13px] font-semibold uppercase tracking-wide text-ink-2">{t.floorName}</label>
            <div className="flex gap-2">
              <input id={`floor-${floor.id}`} name="name" defaultValue={floor.name ?? ""} placeholder={t.floorN(i + 1)} maxLength={FLOOR_NAME_MAX} className={`${input} min-w-0 flex-1`} />
              <button type="submit" className={small}>{t.save}</button>
            </div>
          </ActionForm>

          <ul className="flex flex-col gap-3">
            {floor.rooms.map((room) => (
              <li key={room.id} className="flex flex-col gap-3 rounded-xl bg-surface p-3">
                <ActionForm action={renameRoomAction.bind(null, room.id)} className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <RoomTypeSelect value={room.type} label={t.roomType} names={t.roomTypes} />
                    <input name="name" defaultValue={room.name} aria-label={t.roomName} maxLength={ROOM_NAME_MAX} className={`${input} min-w-0 flex-1`} />
                  </div>
                  <button type="submit" className={`${small} self-start`}>{t.save}</button>
                </ActionForm>

                {room.fixtures.length > 0 && (
                  <ul className="flex flex-wrap gap-2">
                    {room.fixtures.map((f) => (
                      <li key={f.id}>
                        <ActionForm action={removeFixtureAction.bind(null, f.id)}>
                          <button type="submit" className="min-h-9 rounded-full border border-line px-3 text-[13px]" aria-label={`${t.remove} ${t.fixtureTypes[f.type]}`}>
                            {t.fixtureTypes[f.type]} ✕
                          </button>
                        </ActionForm>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="flex flex-wrap items-start justify-between gap-2">
                  <ActionForm action={addFixtureAction.bind(null, room.id)} className="flex gap-2">
                    <select name="fixture" defaultValue="" aria-label={t.addFixture} className={`${input} w-40`} required>
                      <option value="" disabled>{t.pickFixture}</option>
                      {FIXTURE_TYPES.map((f) => <option key={f} value={f}>{t.fixtureTypes[f]}</option>)}
                    </select>
                    <button type="submit" className={small}>+</button>
                  </ActionForm>
                  <ActionForm action={removeRoomAction.bind(null, room.id)}>
                    <ConfirmButton label={t.remove} confirmLabel={t.tapAgain} className="min-h-11 px-2 text-[14px] font-medium text-danger" />
                  </ActionForm>
                </div>
              </li>
            ))}
          </ul>

          <ActionForm action={addRoomAction.bind(null, floor.id)} resetOnSuccess className="flex flex-col gap-2 border-t border-line pt-3">
            <p className="text-[14px] font-semibold">{t.addRoom}</p>
            <div className="flex gap-2">
              <RoomTypeSelect value="kitchen" label={t.roomType} names={t.roomTypes} />
              <input name="name" placeholder={t.roomName} aria-label={t.roomName} maxLength={ROOM_NAME_MAX} className={`${input} min-w-0 flex-1`} />
            </div>
            <p className="text-[13px] text-ink-2">{t.roomNameHint}</p>
            <button type="submit" className={`${primary} self-start`}>{t.addRoom}</button>
          </ActionForm>

          {home.floors.length > 1 && (
            <ActionForm action={removeFloorAction.bind(null, floor.id)} className="flex flex-col gap-1">
              <ConfirmButton label={t.removeFloor} confirmLabel={t.tapAgain} className="min-h-11 self-start text-[14px] font-medium text-danger" />
              <p className="text-[12px] text-ink-2">{t.removeFloorHint}</p>
            </ActionForm>
          )}
        </section>
      ))}

      <ActionForm action={addFloorAction}>
        <button type="submit" className={small}>{t.addFloor}</button>
      </ActionForm>
    </main>
  );
}
