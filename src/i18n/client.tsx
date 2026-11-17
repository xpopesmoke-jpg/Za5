"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Lang } from "./config";
import { DICT } from "./dictionary";

const LangContext = createContext<Lang>("en");

/** Gives client components the screen's language. Set once in the root layout. */
export function I18nProvider({ lang, children }: { lang: Lang; children: ReactNode }) {
  return <LangContext.Provider value={lang}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext);
/** The messages for this screen's language: `const t = useT(); t.food.title`. */
export const useT = () => DICT[useContext(LangContext)];
