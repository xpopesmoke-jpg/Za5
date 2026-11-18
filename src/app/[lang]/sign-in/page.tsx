import { redirect } from "next/navigation";
import { DICT } from "@/i18n/dictionary";
import { langOf } from "@/i18n/server";
import { findCurrentUser } from "@/server/session";
import { AuthShell } from "../auth-shell";
import { SignInForm } from "../forms";

export default async function SignInPage({ params, searchParams }: PageProps<"/[lang]/sign-in">) {
  const lang = langOf((await params).lang);
  const invite = typeof (await searchParams).invite === "string" ? ((await searchParams).invite as string) : undefined;
  if (await findCurrentUser()) redirect(invite ? `/join/${encodeURIComponent(invite)}` : "/");
  const t = DICT[lang].auth;
  return (
    <AuthShell lang={lang} path="/sign-in" title={t.signIn} prompt={t.newHere} linkLabel={t.createAccount} linkHref={invite ? `/sign-up?invite=${encodeURIComponent(invite)}` : "/sign-up"}>
      <SignInForm invite={invite} />
    </AuthShell>
  );
}
