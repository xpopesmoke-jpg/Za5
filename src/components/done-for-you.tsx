import type { Lang } from "@/i18n/config";
import { DICT } from "@/i18n/dictionary";
import type { DoneForYou } from "@/server/claims";
import { dismissDoneForYouAction } from "@/app/[lang]/chores/actions";

/** The soft note for a claimer: someone else did what they had claimed. */
export function DoneForYouNotes({ notes, lang }: { notes: DoneForYou[]; lang: Lang }) {
  if (notes.length === 0) return null;
  const t = DICT[lang].chores;
  return (
    <ul className="flex flex-col gap-2">
      {notes.map((n) => (
        <li key={n.occurrenceId} role="status" className="flex items-center gap-3 rounded-card border-2 border-edge bg-clean p-3">
          <span className="flex-1 text-[15px] font-bold text-ink">{t.doneForYou(n.doneByName, n.choreName)}</span>
          <form action={dismissDoneForYouAction.bind(null, n.occurrenceId)}>
            <button type="submit" className="min-h-11 rounded-full border-2 border-edge bg-surface px-4 text-[14px] font-extrabold">
              {t.gotIt}
            </button>
          </form>
        </li>
      ))}
    </ul>
  );
}
