import Link from "next/link";
import type { Lang } from "@/i18n/config";
import { DICT } from "@/i18n/dictionary";
import type { TodayItem } from "@/server/chores";
import { claimAction, completeAction, skipAction, unclaimAction, za5Action } from "@/app/[lang]/chores/actions";
import { localDay } from "@/domain/schedule";
import { LATER_HOURS } from "@/server/za5";

/** Today's list: what is due and overdue, each with a big round Done. */
export function TodayList({ items, lang, timeZone, now }: { items: TodayItem[]; lang: Lang; timeZone: string; now: Date }) {
  const t = DICT[lang].chores;
  const r = DICT[lang].rooms;
  const today = localDay(now, timeZone);
  // "Later today" only while later still lands today.
  const laterFits = localDay(new Date(now.getTime() + LATER_HOURS * 3_600_000), timeZone) === today;
  const clock = new Intl.DateTimeFormat(lang === "hr" ? "hr-HR" : "en-GB", { timeZone, hour: "2-digit", minute: "2-digit" });
  return (
    <section aria-labelledby="today" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 id="today" className="text-[24px]">
          {t.today}
        </h2>
        <Link href="/chores/new" className="flex min-h-11 items-center rounded-full border-2 border-edge bg-surface px-4 text-[14px] font-extrabold">
          {t.addChore}
        </Link>
      </div>
      {items.length === 0 ? (
        <p className="rounded-card border-2 border-dashed border-line p-4 text-[15px] font-semibold text-ink-2">{t.nothingDue}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => {
            const where = item.needsRoom
              ? t.needsRoom
              : !item.roomName
                ? t.wholeHome
                : item.fixtureType
                  ? r.roomAndFixture(item.roomName, r.fixtureTypes[item.fixtureType])
                  : item.roomName;
            const late = item.overdueDays > 0;
            const put = item.postponedUntil;
            const badge = put
              ? localDay(put, timeZone) > today
                ? t.za5UntilTomorrow
                : t.za5Until(clock.format(put))
              : late
                ? t.overdue(item.overdueDays)
                : t.dueToday;
            return (
              <li
                key={item.occurrenceId}
                className={`flex items-start gap-3 rounded-card border-2 p-3 ${put ? "border-dashed border-line bg-raised" : "border-edge bg-surface"}`}
              >
                <form action={completeAction.bind(null, item.occurrenceId)}>
                  <button
                    type="submit"
                    aria-label={t.markDone(item.name)}
                    className="flex size-12 shrink-0 items-center justify-center rounded-full border-[2.5px] border-edge bg-surface text-ink-2 hover:bg-raised hover:text-ink active:bg-clean"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </form>
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <div className="flex items-start gap-2">
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5 pt-0.5">
                      <span className="text-[16px] font-extrabold leading-tight">{item.name}</span>
                      <span className="text-[13px] font-semibold text-ink-2">
                        {where}, {t.minutes(item.effort)}
                      </span>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[12px] font-extrabold ${put ? "bg-za5 text-za5-ink" : late ? "bg-accent text-accent-ink" : "bg-raised text-ink-2"}`}
                    >
                      {badge}
                    </span>
                  </div>
                  {item.note && <span className="text-[13px] text-ink-2">{item.note}</span>}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {/* Keyed by the Za5 time, so the menu comes back closed once the chore is put off. */}
                      <Za5Menu key={item.postponedUntil?.toISOString() ?? "now"} item={item} t={t} laterFits={laterFits} />
                      <form action={skipAction.bind(null, item.occurrenceId)}>
                        <button type="submit" aria-label={t.skipLabel(item.name)} className="min-h-11 px-2 text-[13px] font-bold text-ink-2 underline underline-offset-2">
                          {t.skip}
                        </button>
                      </form>
                    </div>
                    <ClaimControl item={item} t={t} />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

const small = "min-h-11 rounded-full border-2 px-3 text-[13px] font-extrabold";

/** "I'll do it" from the pool, "You're on it" with Give back, or who else is on it. */
function ClaimControl({ item, t }: { item: TodayItem; t: (typeof DICT)["en"]["chores"] }) {
  if (!item.claim) {
    return (
      <form action={claimAction.bind(null, item.occurrenceId)}>
        <button type="submit" aria-label={t.claimLabel(item.name)} className={`${small} border-edge bg-za5 text-za5-ink`}>
          {t.claim}
        </button>
      </form>
    );
  }
  if (item.claim.mine) {
    return (
      <form action={unclaimAction.bind(null, item.occurrenceId)} className="flex items-center gap-2">
        <span className="text-[12px] font-extrabold text-ink">{t.youreOnIt}</span>
        <button type="submit" className={`${small} border-line bg-surface text-ink-2`}>
          {t.giveBack}
        </button>
      </form>
    );
  }
  return <span className="text-[12px] font-extrabold text-ink">{t.onIt(item.claim.name)}</span>;
}

/** The Za5 button: put it off until later today or tomorrow. A plain disclosure, so it works without scripts. */
function Za5Menu({ item, t, laterFits }: { item: TodayItem; t: (typeof DICT)["en"]["chores"]; laterFits: boolean }) {
  return (
    <details className="group relative">
      <summary
        aria-label={t.za5Label(item.name)}
        className="flex min-h-11 cursor-pointer list-none items-center gap-1.5 rounded-full border-2 border-edge bg-za5 px-3.5 font-display text-[15px] font-extrabold text-za5-ink [&::-webkit-details-marker]:hidden"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="2.4" />
          <path d="M12 7.5V12l3 2" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
        {t.za5}
      </summary>
      <div className="absolute left-0 top-full z-10 mt-1.5 flex min-w-40 flex-col gap-1 rounded-2xl border-2 border-edge bg-surface p-1.5 shadow-[0_4px_0_var(--edge)]">
        {laterFits && (
          <form action={za5Action.bind(null, item.occurrenceId, "later")}>
            <button type="submit" className="min-h-11 w-full rounded-xl px-3 text-left text-[14px] font-bold hover:bg-raised">
              {t.laterToday}
            </button>
          </form>
        )}
        <form action={za5Action.bind(null, item.occurrenceId, "tomorrow")}>
          <button type="submit" className="min-h-11 w-full rounded-xl px-3 text-left text-[14px] font-bold hover:bg-raised">
            {t.tomorrow}
          </button>
        </form>
      </div>
    </details>
  );
}
