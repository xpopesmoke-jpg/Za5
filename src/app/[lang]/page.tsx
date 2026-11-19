import Link from "next/link";
import { getDb } from "@/db/client";
import { RoomTiles } from "@/components/room-tiles";
import { AwayBanner, GoAway } from "@/components/away-panel";
import { Balance } from "@/components/balance";
import { DoneForYouNotes } from "@/components/done-for-you";
import { InvitePanel } from "@/components/invite-panel";
import { HomeMapSection } from "@/components/home-map-section";
import { TodayList } from "@/components/today-list";
import { LanguageSwitch } from "@/components/language-switch";
import { DICT } from "@/i18n/dictionary";
import { langOf } from "@/i18n/server";
import { getToday, hasAnyChore } from "@/server/chores";
import { getDoneForYou } from "@/server/claims";
import { getFairness } from "@/server/fairness";
import { getHomeMap } from "@/server/home-map";
import { getZa5Count } from "@/server/za5";
import { getHome } from "@/server/home";
import { getCurrentHome } from "@/server/session";
import { signOut } from "./actions";

export default async function HomePage({ params }: PageProps<"/[lang]">) {
  const lang = langOf((await params).lang);
  const { me, household } = await getCurrentHome();
  const now = new Date();
  const db = getDb();
  const [home, today, doneForYou, balance, za5Count, hasChores, map] = await Promise.all([
    getHome(db, me.id),
    getToday(db, me.id, now),
    getDoneForYou(db, me.id),
    getFairness(db, me.id, now),
    getZa5Count(db, me.id, now),
    hasAnyChore(db, me.id),
    getHomeMap(db, me.id, now),
  ]);
  const t = DICT[lang];
  const hasRooms = home.floors.some((f) => f.rooms.length > 0);
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
      {home.canEdit && hasRooms && !hasChores && (
        <section aria-labelledby="setup" className="flex flex-col gap-2 rounded-card border-2 border-edge bg-za5 p-4 text-za5-ink">
          <h2 id="setup" className="text-[22px]">{t.setup.startTitle}</h2>
          <p className="text-[14px]">{t.setup.startBody}</p>
          <Link href="/setup" className="mt-1 flex min-h-12 items-center justify-center rounded-full border-2 border-edge bg-surface text-[16px] font-extrabold text-ink">
            {t.setup.start}
          </Link>
        </section>
      )}
      <HomeMapSection map={map}>
        <TodayList items={today} lang={lang} timeZone={household.timeZone} now={now} />
      </HomeMapSection>
      <Balance rows={balance} za5Count={za5Count} lang={lang} />
      <RoomTiles home={home} lang={lang} />
      {home.canEdit && hasRooms && hasChores && (
        <Link href="/setup" className="-mt-2 self-start text-[14px] font-bold text-ink-2 underline">
          {t.setup.resume}
        </Link>
      )}
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
