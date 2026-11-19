import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { ActionForm } from "@/components/action-form";
import { Button } from "@/components/ui";
import {
  CHORE_NAME_MAX,
  CHORE_NOTE_MAX,
  EFFORT_MAX,
  EVERY_DAYS_MAX,
  SETUP_EXTRA_ROWS,
} from "@/domain/limits";
import { DICT } from "@/i18n/dictionary";
import { langOf } from "@/i18n/server";
import { getHome } from "@/server/home";
import { getCurrentHome } from "@/server/session";
import { getSetupStep, getSetupSteps } from "@/server/walkthrough";
import { saveSetupAction } from "../actions";

const num =
  "min-h-11 w-16 rounded-xl border-2 border-line bg-surface px-2 text-center text-[16px] text-ink";
const field =
  "min-h-11 w-full rounded-xl border-2 border-line bg-surface px-3 text-[15px] text-ink";

/** One stop of the walkthrough: a Room's suggested Chores (or the Whole home's), what's there, and extras. */
export default async function SetupStepPage({
  params,
}: PageProps<"/[lang]/setup/[step]">) {
  const { lang: raw, step } = await params;
  const lang = langOf(raw);
  const { me } = await getCurrentHome();
  const db = getDb();
  if (!(await getHome(db, me.id)).canEdit) redirect("/");
  const steps = await getSetupSteps(db, me.id);
  const index = steps.findIndex((s) =>
    s.kind === "whole" ? step === "whole" : s.roomId === step,
  );
  if (index < 0) notFound();
  const here = steps[index];
  const roomId = here.kind === "room" ? here.roomId : null;
  const { suggestions, added } = await getSetupStep(db, me.id, roomId, lang);
  const t = DICT[lang].setup;
  const fx = DICT[lang].rooms.fixtureTypes;
  const hrefOf = (i: number) => {
    const s = steps[i];
    return `/setup/${s.kind === "whole" ? "whole" : s.roomId}`;
  };
  const last = index === steps.length - 1;
  const saveLabel = last
    ? t.finish
    : steps[index + 1].kind === "whole"
      ? t.saveWhole
      : t.saveNext;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-5 px-5 py-8">
      <header className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          {index > 0 ? (
            <Link
              href={hrefOf(index - 1)}
              className="flex min-h-11 items-center text-[15px] font-bold text-ink-2"
            >
              {t.back}
            </Link>
          ) : (
            <span />
          )}
          <span className="text-[13px] font-bold tabular-nums text-ink-2">
            {t.stepOf(index + 1, steps.length)}
          </span>
        </div>
        <div
          className="h-3 overflow-hidden rounded-full border-2 border-edge bg-track"
          aria-hidden="true"
        >
          <div
            className="h-full rounded-full bg-za5"
            style={{ width: `${((index + 1) / steps.length) * 100}%` }}
          />
        </div>
        <h1 className="text-[30px]">
          {here.kind === "room" ? here.name : t.wholeHome}
        </h1>
        {here.kind === "whole" && (
          <p className="text-[15px] text-ink-2">{t.wholeBody}</p>
        )}
      </header>

      {added.length > 0 && (
        <section aria-labelledby="added" className="flex flex-col gap-2">
          <h2 id="added" className="text-[18px]">
            {t.alreadyHere}
          </h2>
          <ul className="flex flex-col gap-1.5">
            {added.map((c) => (
              <li
                key={c.choreId}
                className="flex items-center justify-between gap-3 rounded-2xl border-2 border-line bg-clean px-3 py-2"
              >
                <span className="text-[15px] font-bold">{c.name}</span>
                <span className="shrink-0 text-[13px] font-semibold text-ink">
                  {[
                    c.everyDays ? t.everyN(c.everyDays) : null,
                    `${c.effort} ${t.minutes}`,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <ActionForm
        action={saveSetupAction.bind(null, roomId ?? "whole")}
        className="flex flex-col gap-6"
      >
        <section aria-labelledby="suggested" className="flex flex-col gap-2">
          <h2 id="suggested" className="text-[18px]">
            {t.suggested}
          </h2>
          {suggestions.length === 0 ? (
            <p className="rounded-2xl border-2 border-dashed border-line p-3 text-[14px] text-ink-2">
              {t.nothingLeft}
            </p>
          ) : (
            <>
              <p className="text-[13px] text-ink-2">{t.suggestedBody}</p>
              <ul className="flex flex-col gap-2">
                {suggestions.map((s) => (
                  <li
                    key={s.key}
                    className="flex flex-col gap-2 rounded-card border-2 border-edge bg-surface p-3"
                  >
                    <label className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        name="keep"
                        value={s.key}
                        defaultChecked
                        className="mt-0.5 size-6 shrink-0 accent-[var(--accent)]"
                      />
                      <span className="flex flex-col">
                        <span className="text-[16px] font-extrabold leading-tight">
                          {s.name}
                        </span>
                        {s.fixtureType && (
                          <span className="text-[13px] font-semibold text-ink-2">
                            {t.atFixture(fx[s.fixtureType])}
                          </span>
                        )}
                      </span>
                    </label>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 pl-9 text-[14px] font-semibold">
                      <span className="inline-flex items-center gap-2">
                        <span>{t.every}</span>
                        <input
                          type="number"
                          name={`every_${s.key}`}
                          defaultValue={s.everyDays}
                          min={1}
                          max={EVERY_DAYS_MAX}
                          aria-label={`${s.name}: ${t.everyAria}`}
                          className={num}
                        />
                        <span>{t.days ? `${t.days},` : ""}</span>
                      </span>
                      <span className="inline-flex items-center gap-2">
                        {t.effortLead && <span>{t.effortLead}</span>}
                        <input
                          type="number"
                          name={`effort_${s.key}`}
                          defaultValue={s.effort}
                          min={1}
                          max={EFFORT_MAX}
                          aria-label={`${s.name}: ${t.minutesAria}`}
                          className={num}
                        />
                        <span>{t.minutes}</span>
                      </span>
                    </div>
                    <details className="pl-9">
                      <summary className="min-h-9 cursor-pointer text-[13px] font-bold text-ink-2 underline">
                        {t.addNote}
                      </summary>
                      <input
                        name={`note_${s.key}`}
                        maxLength={CHORE_NOTE_MAX}
                        aria-label={`${s.name}: ${t.note}`}
                        className={`${field} mt-1.5`}
                      />
                    </details>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <section aria-labelledby="missing" className="flex flex-col gap-2">
          <h2 id="missing" className="text-[18px]">
            {t.missing}
          </h2>
          <p className="text-[13px] text-ink-2">{t.missingBody}</p>
          {Array.from({ length: SETUP_EXTRA_ROWS }, (_, i) => (
            <div
              key={i}
              className="flex flex-col gap-2 rounded-card border-2 border-dashed border-line p-3"
            >
              <input
                name={`extra_name_${i}`}
                maxLength={CHORE_NAME_MAX}
                placeholder={t.choreName}
                aria-label={`${t.choreName} ${i + 1}`}
                className={field}
              />
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[14px] font-semibold">
                <span className="inline-flex items-center gap-2">
                  <span>{t.every}</span>
                  <input
                    type="number"
                    name={`extra_every_${i}`}
                    defaultValue={7}
                    min={1}
                    max={EVERY_DAYS_MAX}
                    aria-label={`${t.choreName} ${i + 1}: ${t.everyAria}`}
                    className={num}
                  />
                  <span>{t.days ? `${t.days},` : ""}</span>
                </span>
                <span className="inline-flex items-center gap-2">
                  {t.effortLead && <span>{t.effortLead}</span>}
                  <input
                    type="number"
                    name={`extra_effort_${i}`}
                    defaultValue={10}
                    min={1}
                    max={EFFORT_MAX}
                    aria-label={`${t.choreName} ${i + 1}: ${t.minutesAria}`}
                    className={num}
                  />
                  <span>{t.minutes}</span>
                </span>
              </div>
              <input
                name={`extra_note_${i}`}
                maxLength={CHORE_NOTE_MAX}
                placeholder={t.note}
                aria-label={`${t.choreName} ${i + 1}: ${t.note}`}
                className={field}
              />
            </div>
          ))}
        </section>

        <div className="flex flex-col gap-3">
          <Button type="submit">{saveLabel}</Button>
          <Link
            href="/"
            className="self-center text-[14px] font-bold text-ink-2 underline"
          >
            {t.later}
          </Link>
        </div>
      </ActionForm>
    </main>
  );
}
