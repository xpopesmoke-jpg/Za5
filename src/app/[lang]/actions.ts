"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { APIError } from "better-auth/api";
import { PASSWORD_MIN } from "@/domain/limits";
import { isEmailTaken } from "@/server/auth";
import { createHousehold } from "@/server/households";
import { getAuth, getCurrentUser } from "@/server/session";
import { requestLang } from "@/i18n/server";
import { DICT } from "@/i18n/dictionary";
import { text, toActionError, type ActionResult } from "./action-result";

/** An invite token carried through sign-in and sign-up, so the person lands back on the join page. */
const INVITE_TOKEN = /^[A-Za-z0-9_-]{20,64}$/;
const afterAuth = (form: FormData, otherwise: string) => {
  const invite = text(form, "invite");
  return INVITE_TOKEN.test(invite) ? `/join/${invite}` : otherwise;
};

export async function signIn(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const lang = await requestLang();
  try {
    await getAuth().api.signInEmail({
      body: { email: text(form, "email"), password: String(form.get("password") ?? "") },
      headers: await headers(),
    });
  } catch (err) {
    if (err instanceof APIError) return { error: DICT[lang].auth.errors.wrongLogin };
    return toActionError(err, lang);
  }
  redirect(afterAuth(form, "/"));
}

export async function signUp(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const lang = await requestLang();
  const t = DICT[lang].auth.errors;
  const password = String(form.get("password") ?? "");
  if (password.length < PASSWORD_MIN) return { error: t.shortPassword };
  try {
    const email = text(form, "email");
    await getAuth().api.signUpEmail({
      body: { name: text(form, "name") || email.split("@")[0], email, password },
      headers: await headers(),
    });
  } catch (err) {
    if (isEmailTaken(err)) return { error: t.emailTaken };
    return toActionError(err, lang);
  }
  redirect(afterAuth(form, "/new-home"));
}

export async function signOut() {
  await getAuth().api.signOut({ headers: await headers() });
  redirect("/sign-in");
}

export async function nameHome(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const me = await getCurrentUser();
  try {
    await createHousehold(getDb(), me.id, text(form, "name"));
  } catch (err) {
    return toActionError(err, await requestLang());
  }
  redirect("/");
}
