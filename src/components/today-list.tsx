import Link from "next/link";
import type { Lang } from "@/i18n/config";
import { DICT } from "@/i18n/dictionary";
import type { TodayItem } from "@/server/chores";
import { claimAction, completeAction, unclaimAction } from "@/app/[lang]/chores/actions";

/** Today's list: what is due and overdue, each with a big round Done. */
export function TodayList({ items, lang }: { items: TodayItem[]; lang: Lang }) {
  const t = DICT[lang].chores;
  const r = DICT[lang].rooms;
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
            return (
              <li key={item.occurrenceId} className="flex items-start gap-3 rounded-card border-2 border-edge bg-surface p-3">
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
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[12px] font-extrabold ${late ? "bg-accent text-accent-ink" : "bg-raised text-ink-2"}`}>
                      {late ? t.overdue(item.overdueDays) : t.dueToday}
                    </span>
                  </div>
                  {item.note && <span className="text-[13px] text-ink-2">{item.note}</span>}
                  <div className="flex justify-end">
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
