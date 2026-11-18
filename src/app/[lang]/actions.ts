"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { APIError } from "better-auth/api";
import { PASSWORD_MIN } from "@/domain/limits";
import { isEmailTaken } from "@/server/auth";
import { createHousehold } from "@/server/households";
import { isInviteToken, joinIfInvited } from "@/server/invites";
import { getAuth, getCurrentUser } from "@/server/session";
import { requestLang } from "@/i18n/server";
import { DICT } from "@/i18n/dictionary";
import { text, toActionError, type ActionResult } from "./action-result";

/** An invite token carried through sign-in, so the person lands back on the join page to confirm. */
const afterSignIn = (form: FormData) => {
  const invite = text(form, "invite");
  return isInviteToken(invite) ? `/join/${invite}` : "/";
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
  redirect(afterSignIn(form));
}

export async function signUp(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const lang = await requestLang();
  const t = DICT[lang].auth.errors;
  const password = String(form.get("password") ?? "");
  if (password.length < PASSWORD_MIN) return { error: t.shortPassword };
  let userId: string;
  try {
    const email = text(form, "email");
    const made = await getAuth().api.signUpEmail({
      body: { name: text(form, "name") || email.split("@")[0], email, password },
      headers: await headers(),
    });
    userId = made.user.id;
  } catch (err) {
    if (isEmailTaken(err)) return { error: t.emailTaken };
    return toActionError(err, lang);
  }
  // Signed up through an invite: straight into that home. If the link went bad meanwhile, the join page says so.
  const invite = text(form, "invite");
  if (invite) redirect((await joinIfInvited(getDb(), userId, invite, new Date())) ? "/" : `/join/${encodeURIComponent(invite)}`);
  redirect("/new-home");
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
