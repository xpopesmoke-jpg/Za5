import type { Lang } from "./config";
import common from "./messages/common";
import auth from "./messages/auth";
import home from "./messages/home";
import rooms from "./messages/rooms";
import chores from "./messages/chores";
import invite from "./messages/invite";
import setup from "./messages/setup";
import plan from "./messages/plan";

const areas = { common, auth, home, rooms, chores, invite, setup, plan };
type Areas = typeof areas;
export type Dict = { [K in keyof Areas]: Areas[K]["en"] };

function build(lang: Lang): Dict {
  return Object.fromEntries(Object.entries(areas).map(([k, v]) => [k, v[lang]])) as Dict;
}

/** Every message in both languages: `t.home.nameTitle`, `t.home.welcome(name)`. */
export const DICT: Record<Lang, Dict> = { en: build("en"), hr: build("hr") };
