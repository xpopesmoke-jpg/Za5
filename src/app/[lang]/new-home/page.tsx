import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { DICT } from "@/i18n/dictionary";
import { langOf } from "@/i18n/server";
import { getMyHousehold } from "@/server/households";
import { getCurrentUser } from "@/server/session";
import { NameHomeForm } from "../forms";

export default async function NewHomePage({ params }: PageProps<"/[lang]/new-home">) {
  const lang = langOf((await params).lang);
  const me = await getCurrentUser();
  if (await getMyHousehold(getDb(), me.id)) redirect("/");
  const t = DICT[lang].home;
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 px-5 py-10">
      <h1 className="text-[28px] font-bold tracking-tight">{t.nameTitle}</h1>
      <p className="text-[15px] text-ink-2">{t.nameBody}</p>
      <NameHomeForm />
    </main>
  );
}
