import Link from "next/link";
import { redirect } from "next/navigation";
import { LanguageSwitch } from "@/components/language-switch";
import { DICT } from "@/i18n/dictionary";
import { langOf } from "@/i18n/server";
import { findCurrentUser } from "@/server/session";
import { SignUpForm } from "../forms";

export default async function SignUpPage({ params }: PageProps<"/[lang]/sign-up">) {
  const lang = langOf((await params).lang);
  if (await findCurrentUser()) redirect("/");
  const t = DICT[lang];
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-8 px-5 py-10">
      <header>
        <p className="text-[34px] font-bold tracking-tight">{t.common.appName}</p>
        <p className="text-[15px] text-ink-2">{t.common.tagline}</p>
      </header>
      <h1 className="text-[24px] font-semibold">{t.auth.signUpTitle}</h1>
      <SignUpForm />
      <p className="text-[14px] text-ink-2">
        {t.auth.haveAccount}{" "}
        <Link href="/sign-in" className="font-semibold text-accent">
          {t.auth.signIn}
        </Link>
      </p>
      <LanguageSwitch lang={lang} path="/sign-up" />
    </main>
  );
}
