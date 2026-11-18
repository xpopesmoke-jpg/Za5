import Link from "next/link";
import { getDb } from "@/db/client";
import { ActionForm } from "@/components/action-form";
import { Button, Field } from "@/components/ui";
import { CHORE_NAME_MAX, CHORE_NOTE_MAX, EFFORT_MAX, EVERY_DAYS_MAX } from "@/domain/limits";
import { DICT } from "@/i18n/dictionary";
import { langOf } from "@/i18n/server";
import { getHome } from "@/server/home";
import { getCurrentHome } from "@/server/session";
import { addChoreAction } from "../actions";

const control = "min-h-12 rounded-2xl border-2 border-line bg-surface px-4 text-[16px] text-ink";

/** Any Member adds a Chore: what, where, how often and how long. */
export default async function NewChorePage({ params }: PageProps<"/[lang]/chores/new">) {
  const lang = langOf((await params).lang);
  const { me } = await getCurrentHome();
  const home = await getHome(getDb(), me.id);
  const t = DICT[lang].chores;
  const fx = DICT[lang].rooms.fixtureTypes;
  const rooms = home.floors.flatMap((f) => f.rooms);
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-5 py-8">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-[28px]">{t.newChoreTitle}</h1>
        <Link href="/" className="text-[15px] font-bold text-ink-2 underline">
          {t.cancel}
        </Link>
      </header>
      <ActionForm action={addChoreAction} className="flex flex-col gap-5">
        <Field label={t.name} name="name" placeholder={t.namePlaceholder} maxLength={CHORE_NAME_MAX} required />

        <div className="flex flex-col gap-1.5">
          <label htmlFor="field-place" className="text-[14px] font-bold">
            {t.place}
          </label>
          <select id="field-place" name="place" defaultValue={rooms[0] ? `room:${rooms[0].id}` : "whole"} className={control}>
            {rooms.map((room) => [
              <option key={room.id} value={`room:${room.id}`}>
                {room.name}
              </option>,
              ...room.fixtures.map((f) => (
                <option key={f.id} value={`fixture:${f.id}`}>
                  {`${room.name}, ${fx[f.type].toLowerCase()}`}
                </option>
              )),
            ])}
            <option value="whole">{t.wholeHome}</option>
          </select>
        </div>

        <fieldset className="flex flex-col gap-3 rounded-card border-2 border-line p-4">
          <legend className="px-1 text-[14px] font-bold">{t.howOften}</legend>
          <label className="flex min-h-11 items-center gap-3 text-[16px] font-semibold">
            <input type="radio" name="scheduleKind" value="every" defaultChecked className="size-5 accent-[var(--accent)]" />
            {t.everyLabel}
            <input
              type="number"
              name="everyDays"
              aria-label={`${t.everyLabel} … ${t.days}`}
              defaultValue={7}
              min={1}
              max={EVERY_DAYS_MAX}
              className={`${control} w-20 text-center`}
            />
            {t.days}
          </label>
          <label className="flex min-h-11 items-center gap-3 text-[16px] font-semibold">
            <input type="radio" name="scheduleKind" value="weekdays" className="size-5 accent-[var(--accent)]" />
            {t.onDays}
          </label>
          <div className="grid grid-cols-7 gap-1.5 pl-8">
            {t.weekdaysShort.map((label, i) => (
              <label key={label} className="flex flex-col items-center gap-1 text-[12px] font-bold text-ink-2">
                <input type="checkbox" name="weekdays" value={i + 1} className="size-5 accent-[var(--accent)]" />
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        <Field label={t.effort} name="effort" type="number" inputMode="numeric" min={1} max={EFFORT_MAX} defaultValue={10} hint={t.effortHint} required />
        <Field label={t.note} name="note" maxLength={CHORE_NOTE_MAX} hint={t.noteHint} />
        <Button type="submit">{t.save}</Button>
      </ActionForm>
    </main>
  );
}
