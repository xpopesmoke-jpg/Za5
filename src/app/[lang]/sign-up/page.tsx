import { redirect } from "next/navigation";
import { DICT } from "@/i18n/dictionary";
import { langOf } from "@/i18n/server";
import { findCurrentUser } from "@/server/session";
import { AuthShell } from "../auth-shell";
import { SignUpForm } from "../forms";

export default async function SignUpPage({ params }: PageProps<"/[lang]/sign-up">) {
  const lang = langOf((await params).lang);
  if (await findCurrentUser()) redirect("/");
  const t = DICT[lang].auth;
  return (
    <AuthShell lang={lang} path="/sign-up" title={t.signUpTitle} prompt={t.haveAccount} linkLabel={t.signIn} linkHref="/sign-in">
      <SignUpForm />
    </AuthShell>
  );
}
