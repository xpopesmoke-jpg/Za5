import { redirect } from "next/navigation";
import { DICT } from "@/i18n/dictionary";
import { langOf } from "@/i18n/server";
import { findCurrentUser } from "@/server/session";
import { AuthShell } from "../auth-shell";
import { SignInForm } from "../forms";

export default async function SignInPage({ params }: PageProps<"/[lang]/sign-in">) {
  const lang = langOf((await params).lang);
  if (await findCurrentUser()) redirect("/");
  const t = DICT[lang].auth;
  return (
    <AuthShell lang={lang} path="/sign-in" title={t.signIn} prompt={t.newHere} linkLabel={t.createAccount} linkHref="/sign-up">
      <SignInForm />
    </AuthShell>
  );
}
