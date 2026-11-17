/**
 * The app speaks English or Croatian. The choice lives in a cookie, so every screen is served in it
 * without a flash.
 */
export const LANGS = ["en", "hr"] as const;
export type Lang = (typeof LANGS)[number];
export const LANG_COOKIE = "lang";
export const isLang = (v: unknown): v is Lang => v === "en" || v === "hr";


/** The saved choice, else the phone's language (Croatian if it asks for Croatian first), else English. */
export function langFromRequest(cookie: string | undefined | null, acceptLanguage: string | null): Lang {
  if (isLang(cookie)) return cookie;
  const first = (acceptLanguage ?? "").split(",")[0]?.trim().toLowerCase() ?? "";
  return first === "hr" || first.startsWith("hr-") ? "hr" : "en";
}

/** Paths served without a language: route handlers, files and paths that already carry one. */
const PASS_THROUGH = [/^\/(en|hr)(\/|$)/, /^\/(api|_next)(\/|$)/, /\.[a-z0-9]+$/i];

/** The internal path for a screen in this language ("/today" → "/hr/today"), or null to leave the request alone. */
export function routeForLang(pathname: string, lang: Lang): string | null {
  if (PASS_THROUGH.some((r) => r.test(pathname))) return null;
  return pathname === "/" ? `/${lang}` : `/${lang}${pathname}`;
}

/** "/hr/today" typed or shared as an address → show "/today" in Croatian (and remember Croatian). */
export function prefixedPath(pathname: string): { lang: Lang; to: string } | null {
  const m = /^\/(en|hr)(\/.*)?$/.exec(pathname);
  if (!m) return null;
  const rest = m[2] && m[2] !== "/" ? m[2] : "/";
  return { lang: m[1] as Lang, to: rest };
}
