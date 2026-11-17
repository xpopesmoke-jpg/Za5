import type { Lang } from "@/i18n/config";
import { DICT } from "@/i18n/dictionary";

/** Switches language with a full page load: "/hr/…" is remembered by the proxy and shown at the plain address. */
export function LanguageSwitch({ lang, path = "/" }: { lang: Lang; path?: string }) {
  const t = DICT[lang].common;
  const other: Lang = lang === "en" ? "hr" : "en";
  const rest = path === "/" ? "" : path;
  return (
    <a href={`/${other}${rest}`} className="text-[14px] font-medium text-accent" hrefLang={other}>
      {other === "hr" ? t.croatian : t.english}
    </a>
  );
}
