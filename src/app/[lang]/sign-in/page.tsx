import { redirect } from "next/navigation";
import { DICT } from "@/i18n/dictionary";
import { langOf } from "@/i18n/server";
import { findCurrentUser } from "@/server/session";
import { AuthShell } from "../auth-shell";
import { inviteFrom, withInvite } from "../invite-param";
import { SignInForm } from "../forms";

export default async function SignInPage({ params, searchParams }: PageProps<"/[lang]/sign-in">) {
  const lang = langOf((await params).lang);
  const invite = inviteFrom(await searchParams);
  if (await findCurrentUser()) redirect(invite ? `/join/${invite}` : "/");
  const t = DICT[lang].auth;
  return (
    <AuthShell lang={lang} path="/sign-in" title={t.signIn} prompt={t.newHere} linkLabel={t.createAccount} linkHref={withInvite("/sign-up", invite)}>
      <SignInForm invite={invite} />
    </AuthShell>
  );
}
