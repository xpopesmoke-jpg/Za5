import type { Shape } from "../shape";

/** setup: the room-by-room walkthrough of suggested chores. English first. */
const en = {
  startTitle: "Set up chores room by room",
  startBody: "Za5 suggests chores for each room from what's in it. Keep what fits, drop the rest, add what's missing.",
  start: "Start",
  stepOf: (n: number, total: number) => `${n} of ${total}`,
  wholeHome: "Whole home",
  wholeBody: "Chores that belong to no single room.",
  suggested: "Suggested",
  suggestedBody: "Ticked ones are added. Change how often and how long if it fits you better.",
  every: "Every",
  days: "days",
  minutes: "min",
  effortLead: "",
  everyAria: "every how many days",
  minutesAria: "minutes it takes",
  resume: "Room-by-room suggestions",
  atFixture: (fixture: string) => `At the ${fixture.toLowerCase()}`,
  addNote: "Add a note",
  note: "Note",
  alreadyHere: "Already here",
  everyN: (n: number) => (n === 1 ? "Every day" : `Every ${n} days`),
  missing: "Anything we missed?",
  missingBody: "Add chores the list didn't think of.",
  choreName: "Chore",
  saveNext: "Save and go to the next room",
  saveWhole: "Save and go to the whole home",
  finish: "Save and finish",
  back: "Back",
  later: "Finish later",
  nothingLeft: "Everything we'd suggest for this room is already here.",
  suggestionsFor: "Suggested chores",
};

const hr: Shape<typeof en> = {
  startTitle: "Postavi poslove prostoriju po prostoriju",
  startBody: "Za5 predlaže poslove za svaku prostoriju prema onome što je u njoj. Zadrži što ti odgovara, makni ostalo, dodaj što nedostaje.",
  start: "Kreni",
  stepOf: (n: number, total: number) => `${n} od ${total}`,
  wholeHome: "Cijeli dom",
  wholeBody: "Poslovi koji ne pripadaju jednoj prostoriji.",
  suggested: "Prijedlozi",
  suggestedBody: "Označeni se dodaju. Promijeni koliko često i koliko dugo ako ti tako više odgovara.",
  // Croatian number agreement (svaki dan, svaka 3 dana, svakih 5 dana) can't follow a typed number, so the
  // field gets a label that needs none.
  every: "Razmak u danima:",
  days: "",
  minutes: "min",
  effortLead: "Trajanje:",
  everyAria: "razmak u danima",
  minutesAria: "trajanje u minutama",
  resume: "Prijedlozi po prostorijama",
  atFixture: (fixture: string) => `Element: ${fixture.toLowerCase()}`,
  addNote: "Dodaj bilješku",
  note: "Bilješka",
  alreadyHere: "Već je ovdje",
  everyN: (n: number) => {
    const last = n % 10;
    const teen = n % 100 >= 11 && n % 100 <= 14;
    if (last === 1 && !teen) return n === 1 ? "Svaki dan" : `Svaki ${n} dan`;
    if (last >= 2 && last <= 4 && !teen) return `Svaka ${n} dana`;
    return `Svakih ${n} dana`;
  },
  missing: "Jesmo li nešto propustili?",
  missingBody: "Dodaj poslove kojih nema na popisu.",
  choreName: "Posao",
  saveNext: "Spremi i idi na sljedeću prostoriju",
  saveWhole: "Spremi i idi na cijeli dom",
  finish: "Spremi i završi",
  back: "Natrag",
  later: "Završi kasnije",
  nothingLeft: "Sve što bismo predložili za ovu prostoriju već je ovdje.",
  suggestionsFor: "Predloženi poslovi",
};

const messages = { en, hr };
export default messages;
