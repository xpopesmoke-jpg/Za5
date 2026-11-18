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
  "Give the chore a name.": "Daj zadatku ime.",
  "Pick at least one day of the week.": "Odaberi barem jedan dan u tjednu.",
  "That fixture is in another room.": "Taj element je u drugoj prostoriji.",
  "That one is already done.": "To je već gotovo.",
  "Chore wasn't found.": "Zadatak nije pronađen.",
};

const HR_PATTERNS: [RegExp, (m: RegExpExecArray) => string][] = [
  [/^Keep the name under (\d+) characters\.$/, (m) => `Neka ime bude kraće od ${m[1]} znakova.`],
  [/^Keep the note under (\d+) characters\.$/, (m) => `Neka bilješka bude kraća od ${m[1]} znakova.`],
  [/^Effort is 1 to (\d+) minutes\.$/, (m) => `Trajanje je od 1 do ${m[1]} minuta.`],
  [/^Pick how often: every 1 to (\d+) days\.$/, (m) => `Odaberi koliko često: svakih 1 do ${m[1]} dana.`],
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
