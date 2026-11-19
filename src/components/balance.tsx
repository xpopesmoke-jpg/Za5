import type { Lang } from "@/i18n/config";
import { DICT } from "@/i18n/dictionary";
import type { FairnessRow } from "@/server/fairness";

/** The Fairness balance: each Member's minutes over the last 30 days, and the Member's own Za5 count. */
export function Balance({ rows, za5Count, lang }: { rows: FairnessRow[]; za5Count: number; lang: Lang }) {
  const t = DICT[lang].chores;
  const most = Math.max(1, ...rows.map((r) => r.minutes));
  return (
    <section aria-labelledby="balance" className="flex flex-col gap-3 rounded-card border-2 border-edge bg-surface p-4">
      <div>
        <h2 id="balance" className="text-[20px]">
          {t.balanceTitle}
        </h2>
        <p className="text-[13px] text-ink-2">{t.balanceBody}</p>
      </div>
      <ul className="flex flex-col gap-2.5">
        {rows.map((r) => (
          <li key={r.userId} className="flex flex-col gap-1">
            <div className="flex justify-between text-[14px] font-extrabold">
              <span>{r.isMe ? t.you : r.name}</span>
              <span className="tabular-nums">{t.minutes(r.minutes)}</span>
            </div>
            <div className="h-3.5 overflow-hidden rounded-full border-2 border-edge bg-track">
              <div className={`h-full rounded-full ${r.isMe ? "bg-accent" : "bg-room-1"}`} style={{ width: `${(r.minutes / most) * 100}%` }} />
            </div>
          </li>
        ))}
      </ul>
      <p className="rounded-2xl bg-za5 px-3 py-2 text-[14px] font-bold text-za5-ink">{t.za5Count(za5Count)}</p>
    </section>
  );
}
