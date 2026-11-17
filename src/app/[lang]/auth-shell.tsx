import Link from "next/link";
import type { ReactNode } from "react";
import { LanguageSwitch } from "@/components/language-switch";
import type { Lang } from "@/i18n/config";
import { DICT } from "@/i18n/dictionary";

/** The frame shared by sign-in and sign-up: brand, title, form, a link to the other screen, language switch. */
export function AuthShell(props: { lang: Lang; path: string; title: string; prompt: string; linkLabel: string; linkHref: string; children: ReactNode }) {
  const t = DICT[props.lang].common;
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-8 px-5 py-10">
      <header>
        <p className="text-[34px] font-bold tracking-tight">{t.appName}</p>
        <p className="text-[15px] text-ink-2">{t.tagline}</p>
      </header>
      <h1 className="text-[24px] font-semibold">{props.title}</h1>
      {props.children}
      <p className="text-[14px] text-ink-2">
        {props.prompt}{" "}
        <Link href={props.linkHref} className="font-semibold text-accent">
          {props.linkLabel}
        </Link>
      </p>
      <LanguageSwitch lang={props.lang} path={props.path} />
    </main>
  );
}
