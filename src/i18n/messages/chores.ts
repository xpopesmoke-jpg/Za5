import type { Shape } from "../shape";

/** chores: Chores, Today's list and the add-a-chore form. English first. */
const en = {
  today: "Today",
  nothingDue: "Nothing due today.",
  addChore: "Add a chore",
  markDone: (name: string) => `Mark ${name} done`,
  dueToday: "Due today",
  overdue: (days: number) => (days === 1 ? "1 day overdue" : `${days} days overdue`),
  minutes: (n: number) => `${n} min`,
  wholeHome: "Whole home",
  needsRoom: "Needs a new room",
  newChoreTitle: "New chore",
  name: "Chore",
  namePlaceholder: "Clean the shower",
  place: "Where",
  howOften: "How often",
  everyLabel: "Every",
  days: "days",
  onDays: "On these days",
  effort: "How long it takes",
  effortHint: "Minutes. This is what counts towards the balance between you.",
  note: "Note",
  noteHint: "Optional, e.g. which spray to use.",
  save: "Add chore",
  cancel: "Cancel",
  weekdaysShort: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as [string, string, string, string, string, string, string],
};

const dana = (n: number) => (n % 10 === 1 && n % 100 !== 11 ? "dan" : "dana");

const hr: Shape<typeof en> = {
  today: "Danas",
  nothingDue: "Danas nema ništa na redu.",
  addChore: "Dodaj zadatak",
  markDone: (name: string) => `Označi kao gotovo: ${name}`,
  dueToday: "Na redu danas",
  overdue: (days: number) => `Kasni ${days} ${dana(days)}`,
  minutes: (n: number) => `${n} min`,
  wholeHome: "Cijeli dom",
  needsRoom: "Treba novu prostoriju",
  newChoreTitle: "Novi zadatak",
  name: "Zadatak",
  namePlaceholder: "Očisti tuš-kabinu",
  place: "Gdje",
  howOften: "Koliko često",
  everyLabel: "Svakih",
  days: "dana",
  onDays: "Ovim danima",
  effort: "Koliko traje",
  effortHint: "U minutama. To se broji u ravnoteži između vas.",
  note: "Bilješka",
  noteHint: "Neobavezno, npr. koje sredstvo koristiti.",
  save: "Dodaj zadatak",
  cancel: "Odustani",
  weekdaysShort: ["Pon", "Uto", "Sri", "Čet", "Pet", "Sub", "Ned"],
};

const messages = { en, hr };
export default messages;
