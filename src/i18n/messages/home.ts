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
};

const hr: Shape<typeof en> = {
  nameTitle: "Imenuj svoj dom",
  nameBody: "Kako god želiš: \"Naš stan\", \"Kuća u Omišu\". Možeš promijeniti kasnije.",
  nameLabel: "Ime doma",
  namePlaceholder: "Naš stan",
  create: "Nastavi",
  creating: "Spremam…",
  welcome: (name: string) => `Dobro došli u ${name}`,
  owner: "Ti si vlasnik ovog doma.",
  member: "Ti si član ovog doma.",
  emptyBody: "Ovdje će se pojaviti karta doma i današnji poslovi.",
};

const messages = { en, hr };
export default messages;
