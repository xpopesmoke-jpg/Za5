import type { Lang } from "@/i18n/config";
import { DICT } from "@/i18n/dictionary";
import { setAwayAction } from "@/app/[lang]/chores/actions";

/** Away: a banner with "We're back" while the Household is away, otherwise a small switch to go away. */
export function AwayBanner({ since, lang, timeZone }: { since: Date; lang: Lang; timeZone: string }) {
  const t = DICT[lang].chores;
  const day = new Intl.DateTimeFormat(lang === "hr" ? "hr-HR" : "en-GB", { timeZone, day: "numeric", month: "long" }).format(since);
  return (
    <section aria-label="Away" className="flex items-center gap-3 rounded-card border-2 border-edge bg-room-5 p-3">
      <p className="flex-1 text-[15px] font-bold text-ink">{t.awayBanner(day)}</p>
      <form action={setAwayAction.bind(null, false)}>
        <button type="submit" className="min-h-11 rounded-full border-2 border-edge bg-surface px-4 text-[14px] font-extrabold">
          {t.back}
        </button>
      </form>
    </section>
  );
}

export function GoAway({ lang }: { lang: Lang }) {
  const t = DICT[lang].chores;
  return (
    <section aria-labelledby="away" className="flex flex-col gap-2 rounded-card border-2 border-dashed border-line p-4">
      <h2 id="away" className="text-[18px]">
        {t.awayTitle}
      </h2>
      <p className="text-[14px] text-ink-2">{t.awayBody}</p>
      <form action={setAwayAction.bind(null, true)}>
        <button type="submit" className="min-h-11 rounded-full border-2 border-edge bg-surface px-4 text-[14px] font-extrabold">
          {t.goAway}
        </button>
      </form>
    </section>
  );
}
