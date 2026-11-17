import type { Shape } from "../shape";

/** common: English first; the Croatian must match it key for key. */
const en = {
  appName: "Za5",
  tagline: "Home chores, finally done.",
  appDescription: "Chores, routines and supplies for your home, on your own floor plan.",
  language: "Language",
  english: "English",
  croatian: "Hrvatski",
  signOut: "Sign out",
  tryAgain: "That didn't work. Try again.",
};

const hr: Shape<typeof en> = {
  appName: "Za5",
  tagline: "Kućni poslovi, napokon gotovi.",
  appDescription: "Poslovi, rutine i zalihe za tvoj dom, na tvom vlastitom tlocrtu.",
  language: "Jezik",
  english: "English",
  croatian: "Hrvatski",
  signOut: "Odjava",
  tryAgain: "Nije uspjelo. Pokušaj ponovno.",
};

const messages = { en, hr };
export default messages;
