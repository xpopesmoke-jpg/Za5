import type { Lang } from "./config";

/**
 * Messages from the server (validation errors) are written in English. On a Croatian screen they're shown through
 * this table: exact sentences first, then patterns with numbers in them. Anything not listed is shown as it is.
 */
const HR_EXACT: Record<string, string> = {
  "Give your home a name.": "Daj svom domu ime.",
  "You already belong to a home.": "Već pripadaš jednom domu.",
  "That didn't work. Try again.": "Nije uspjelo. Pokušaj ponovno.",
  "Only the owner can change the home.": "Samo vlasnik može mijenjati dom.",
  "Give the room a name.": "Daj prostoriji ime.",
  "A home needs at least one floor.": "Dom treba imati barem jednu etažu.",
  "Home wasn't found.": "Dom nije pronađen.",
  "Floor wasn't found.": "Etaža nije pronađena.",
  "Room wasn't found.": "Prostorija nije pronađena.",
  "Fixture wasn't found.": "Element nije pronađen.",
  "Pick a room type.": "Odaberi vrstu prostorije.",
  "Pick a fixture.": "Odaberi element.",
};

const HR_PATTERNS: [RegExp, (m: RegExpExecArray) => string][] = [
  [/^Keep the name under (\d+) characters\.$/, (m) => `Neka ime bude kraće od ${m[1]} znakova.`],
];

export function localizeError(lang: Lang, message: string): string {
  if (lang === "en") return message;
  if (HR_EXACT[message]) return HR_EXACT[message];
  for (const [re, f] of HR_PATTERNS) {
    const m = re.exec(message);
    if (m) return f(m);
  }
  return message;
}
