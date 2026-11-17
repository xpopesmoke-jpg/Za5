import { cookies } from "next/headers";
import { isLang, LANG_COOKIE, type Lang } from "./config";
import { DICT } from "./dictionary";

/** The language of a page, from its [lang] route segment. */
export function langOf(raw: string): Lang {
  return isLang(raw) ? raw : "en";
}

/** In server actions and route handlers (no route segment there): the language cookie. */
export async function requestLang(): Promise<Lang> {
  const c = (await cookies()).get(LANG_COOKIE)?.value;
  return isLang(c) ? c : "en";
}

export const dictFor = (lang: Lang) => DICT[lang];
