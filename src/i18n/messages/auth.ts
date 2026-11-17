import type { Shape } from "../shape";

/** auth: English first; the Croatian must match it key for key. */
const en = {
  email: "Email",
  password: "Password",
  atLeast8: "At least 8 characters.",
  yourName: "Your name",
  signIn: "Sign in",
  signingIn: "Signing in…",
  signUp: "Create account",
  signingUp: "Creating account…",
  newHere: "New to Za5?",
  createAccount: "Create an account",
  haveAccount: "Already have an account?",
  signUpTitle: "Create your account",
  errors: {
    wrongLogin: "Wrong email or password.",
    shortPassword: "Use a password with at least 8 characters.",
    emailTaken: "An account with this email already exists. Sign in instead.",
  },
};

const hr: Shape<typeof en> = {
  email: "E-mail",
  password: "Lozinka",
  atLeast8: "Najmanje 8 znakova.",
  yourName: "Tvoje ime",
  signIn: "Prijava",
  signingIn: "Prijavljujem…",
  signUp: "Napravi račun",
  signingUp: "Stvaram račun…",
  newHere: "Prvi put u Za5?",
  createAccount: "Napravi račun",
  haveAccount: "Već imaš račun?",
  signUpTitle: "Napravi svoj račun",
  errors: {
    wrongLogin: "Pogrešan e-mail ili lozinka.",
    shortPassword: "Koristi lozinku od najmanje 8 znakova.",
    emailTaken: "Račun s tim e-mailom već postoji. Prijavi se.",
  },
};

const messages = { en, hr };
export default messages;
