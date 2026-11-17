import Link from "next/link";
import { getDb } from "@/db/client";
import { HomePlan } from "@/components/home-plan";
import { LanguageSwitch } from "@/components/language-switch";
import { DICT } from "@/i18n/dictionary";
import { langOf } from "@/i18n/server";
import { getHome } from "@/server/home";
import { getCurrentHome } from "@/server/session";
import { signOut } from "./actions";

export default async function HomePage({ params }: PageProps<"/[lang]">) {
  const lang = langOf((await params).lang);
  const { me, home: household } = await getCurrentHome();
  const home = await getHome(getDb(), me.id);
  const t = DICT[lang];
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-5 py-8">
      <header className="flex items-center justify-between">
        <p className="text-[22px] font-bold tracking-tight">{t.common.appName}</p>
        <LanguageSwitch lang={lang} />
      </header>
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-[24px] font-semibold">{t.home.welcome(household.name)}</h1>
          <p className="mt-1 text-[14px] text-ink-2">{household.role === "owner" ? t.home.owner : t.home.member}</p>
        </div>
        {home.canEdit && (
          <Link href="/rooms" className="shrink-0 text-[14px] font-semibold text-accent">
            {t.rooms.editRooms}
          </Link>
        )}
      </div>
      <HomePlan home={home} lang={lang} />
      <form action={signOut}>
        <button type="submit" className="text-[14px] font-medium text-ink-2 underline">
          {t.common.signOut}
        </button>
      </form>
    </main>
  );
}
