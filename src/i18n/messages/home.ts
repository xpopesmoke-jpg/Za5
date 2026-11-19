import type { Shape } from "../shape";

/** home: naming the home and the home screen. English first. */
const en = {
  nameTitle: "Name your home",
  nameBody: "Anything you like: \"Our flat\", \"Omiš house\". You can change it later.",
  nameLabel: "Home name",
  namePlaceholder: "Our flat",
  create: "Continue",
  creating: "Saving…",
  welcome: (name: string) => `Welcome to ${name}`,
  owner: "You're the owner of this home.",
  member: "You're a member of this home.",
  emptyBody: "Your home map and today's chores will appear here.",
  mapLabel: "Home map",
  mapSummary: (rooms: number, due: number) => `Your home: ${rooms} ${rooms === 1 ? "room" : "rooms"}, ${due} ${due === 1 ? "chore" : "chores"} today on this floor. Pick a room below to see its chores.`,
  nothingHere: "Nothing due here today.",
  floors: "Floors",
  pickRoom: "Show the chores of one room",
  showing: (place: string) => `Showing: ${place}`,
  showAll: "Show all",
};

const hr: Shape<typeof en> = {
  nameTitle: "Imenuj svoj dom",
  nameBody: "Kako god želiš: \"Naš stan\", \"Kuća u Omišu\". Možeš promijeniti kasnije.",
  nameLabel: "Ime doma",
  namePlaceholder: "Naš stan",
  create: "Nastavi",
  creating: "Spremam…",
  welcome: (name: string) => `Tvoj dom: ${name}`,
  owner: "Ti si vlasnik ovog doma.",
  member: "Ti si član ovog doma.",
  emptyBody: "Ovdje će se pojaviti karta doma i današnji poslovi.",
  mapLabel: "Karta doma",
  mapSummary: (rooms: number, due: number) => `Tvoj dom: prostorija ${rooms}, poslova danas na ovom katu ${due}. Odaberi prostoriju ispod za njezine poslove.`,
  nothingHere: "Ovdje danas nema ništa na redu.",
  floors: "Katovi",
  pickRoom: "Prikaži poslove jedne prostorije",
  showing: (place: string) => `Prikazano: ${place}`,
  showAll: "Prikaži sve",
};

const messages = { en, hr };
export default messages;
