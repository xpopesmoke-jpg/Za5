import type { Shape } from "../shape";

/** invite: inviting a partner and joining a home by link. English first. */
const en = {
  inviteTitle: "Invite your partner",
  inviteBody: "Send them a link. They sign up and join this home. The link works once, for 7 days.",
  makeLink: "Make an invite link",
  copy: "Copy link",
  copied: "Copied",
  share: "Share",
  shareText: (home: string) => `Join ${home} on Za5`,
  joinTitle: (home: string) => `Join ${home}`,
  joinBody: (by: string) => `${by} invited you to share chores on Za5.`,
  join: "Join this home",
  createAccount: "Create an account",
  haveAccount: "I already have an account",
  linkNotValid: "This invite link has been used or has run out. Ask for a new one.",
  alreadyHome: "You already belong to a home, so you can't join another.",
  backHome: "Back to my home",
};

const hr: Shape<typeof en> = {
  inviteTitle: "Pozovi partnera",
  inviteBody: "Pošalji poveznicu. Osoba se registrira i pridruži ovom domu. Poveznica se može iskoristiti jednom i vrijedi 7 dana.",
  makeLink: "Napravi poveznicu za poziv",
  copy: "Kopiraj poveznicu",
  copied: "Kopirano",
  share: "Podijeli",
  shareText: (home: string) => `Pridruži se domu ${home} na Za5`,
  joinTitle: (home: string) => `Pridruži se: ${home}`,
  joinBody: (by: string) => `${by} te poziva da zajedno vodite kućanske poslove na Za5.`,
  join: "Pridruži se ovom domu",
  createAccount: "Izradi račun",
  haveAccount: "Već imam račun",
  linkNotValid: "Ova poveznica je već iskorištena ili je istekla. Zatraži novu.",
  alreadyHome: "Već pripadaš jednom domu pa se ne možeš pridružiti drugom.",
  backHome: "Natrag na moj dom",
};

const messages = { en, hr };
export default messages;
