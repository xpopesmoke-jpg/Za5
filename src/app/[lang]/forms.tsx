"use client";

import { useActionState } from "react";
import { Button, Field, FormMessage } from "@/components/ui";
import { useT } from "@/i18n/client";
import { HOME_NAME_MAX, PASSWORD_MIN } from "@/domain/limits";
import type { ActionResult } from "./action-result";
import { nameHome, signIn, signUp } from "./actions";

export function SignInForm() {
  const t = useT().auth;
  const [state, action, pending] = useActionState<ActionResult, FormData>(signIn, null);
  return (
    <form action={action} className="flex flex-col gap-4">
      <Field label={t.email} name="email" type="email" autoComplete="email" required />
      <Field label={t.password} name="password" type="password" autoComplete="current-password" required />
      <FormMessage error={state?.error} />
      <Button type="submit" disabled={pending}>{pending ? t.signingIn : t.signIn}</Button>
    </form>
  );
}

export function SignUpForm() {
  const t = useT().auth;
  const [state, action, pending] = useActionState<ActionResult, FormData>(signUp, null);
  return (
    <form action={action} className="flex flex-col gap-4">
      <Field label={t.yourName} name="name" autoComplete="given-name" required />
      <Field label={t.email} name="email" type="email" autoComplete="email" required />
      <Field label={t.password} name="password" type="password" autoComplete="new-password" minLength={PASSWORD_MIN} hint={t.atLeast8} required />
      <FormMessage error={state?.error} />
      <Button type="submit" disabled={pending}>{pending ? t.signingUp : t.signUp}</Button>
    </form>
  );
}

export function NameHomeForm() {
  const t = useT().home;
  const [state, action, pending] = useActionState<ActionResult, FormData>(nameHome, null);
  return (
    <form action={action} className="flex flex-col gap-4">
      <Field label={t.nameLabel} name="name" placeholder={t.namePlaceholder} maxLength={HOME_NAME_MAX} autoComplete="off" required />
      <FormMessage error={state?.error} />
      <Button type="submit" disabled={pending}>{pending ? t.creating : t.create}</Button>
    </form>
  );
}
