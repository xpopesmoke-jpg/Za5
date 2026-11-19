import Link from "next/link";
import { getDb } from "@/db/client";
import { RoomTiles } from "@/components/room-tiles";
import { AwayBanner, GoAway } from "@/components/away-panel";
import { Balance } from "@/components/balance";
import { DoneForYouNotes } from "@/components/done-for-you";
import { InvitePanel } from "@/components/invite-panel";
import { TodayList } from "@/components/today-list";
import { LanguageSwitch } from "@/components/language-switch";
import { DICT } from "@/i18n/dictionary";
import { langOf } from "@/i18n/server";
import { getToday } from "@/server/chores";
import { getDoneForYou } from "@/server/claims";
import { getFairness } from "@/server/fairness";
import { getZa5Count } from "@/server/za5";
import { getHome } from "@/server/home";
import { getCurrentHome } from "@/server/session";
import { signOut } from "./actions";

export default async function HomePage({ params }: PageProps<"/[lang]">) {
  const lang = langOf((await params).lang);
  const { me, household } = await getCurrentHome();
  const now = new Date();
  const db = getDb();
  const [home, today, doneForYou, balance, za5Count] = await Promise.all([
    getHome(db, me.id),
    getToday(db, me.id, now),
    getDoneForYou(db, me.id),
    getFairness(db, me.id, now),
    getZa5Count(db, me.id, now),
  ]);
  const t = DICT[lang];
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-5 py-8">
      <header className="flex items-center justify-between">
        <p className="font-display text-[24px] font-extrabold">{t.common.appName}</p>
        <LanguageSwitch lang={lang} />
      </header>
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px]">{t.home.welcome(household.name)}</h1>
          <p className="mt-1 text-[14px] text-ink-2">{household.role === "owner" ? t.home.owner : t.home.member}</p>
        </div>
        {home.canEdit && (
          <Link href="/rooms" className="flex min-h-11 shrink-0 items-center rounded-full border-2 border-edge bg-za5 px-4 text-[14px] font-extrabold text-za5-ink">
            {t.rooms.editRooms}
          </Link>
        )}
      </div>
      {household.awaySince && <AwayBanner since={household.awaySince} lang={lang} timeZone={household.timeZone} />}
      <DoneForYouNotes notes={doneForYou} lang={lang} />
      <TodayList items={today} lang={lang} timeZone={household.timeZone} now={now} />
      <Balance rows={balance} za5Count={za5Count} lang={lang} />
      <RoomTiles home={home} lang={lang} />
      {!household.awaySince && <GoAway lang={lang} />}
      {household.role === "owner" && <InvitePanel homeName={household.name} />}
      <form action={signOut}>
        <button type="submit" className="text-[14px] font-medium text-ink-2 underline">
          {t.common.signOut}
        </button>
      </form>
    </main>
  );
}
