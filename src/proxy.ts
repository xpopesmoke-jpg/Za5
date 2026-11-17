import { NextResponse, type NextRequest } from "next/server";
import { LANG_COOKIE, langFromRequest, prefixedPath, routeForLang, type Lang } from "@/i18n/config";

const YEARS_2 = 60 * 60 * 24 * 365 * 2;
const remember = (res: NextResponse, lang: Lang) =>
  res.cookies.set(LANG_COOKIE, lang, { path: "/", maxAge: YEARS_2, sameSite: "lax", secure: process.env.NODE_ENV === "production" });

/** A page load typed in the address bar or opened from a link (not Next's own data requests). */
const isDocument = (r: NextRequest) => r.method === "GET" && !r.headers.get("rsc") && !r.headers.get("next-action") && !r.headers.get("next-router-state-tree");

/**
 * Serves every screen in the person's language without showing it in the address: "/food" is rendered from
 * "/hr/food" or "/en/food". New visitors get their phone's language, remembered in a cookie. An address that already
 * has a language in it ("/hr/food") goes to the plain address in that language.
 */
export default function proxy(request: NextRequest) {
  const saved = request.cookies.get(LANG_COOKIE)?.value;
  const typed = isDocument(request) ? prefixedPath(request.nextUrl.pathname) : null;
  if (typed) {
    const url = request.nextUrl.clone();
    url.pathname = typed.to;
    const res = NextResponse.redirect(url, 307);
    remember(res, typed.lang);
    return res;
  }
  const lang = langFromRequest(saved, request.headers.get("accept-language"));
  const target = routeForLang(request.nextUrl.pathname, lang);
  if (!target) return NextResponse.next();
  const url = request.nextUrl.clone();
  url.pathname = target;
  const res = NextResponse.rewrite(url);
  res.headers.set("Vary", "Cookie, Accept-Language");
  if (saved !== lang) remember(res, lang);
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
