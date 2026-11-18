import { redirect } from "next/navigation";
import { DICT } from "@/i18n/dictionary";
import { langOf } from "@/i18n/server";
import { findCurrentUser } from "@/server/session";
import { AuthShell } from "../auth-shell";
import { inviteFrom, withInvite } from "../invite-param";
import { SignUpForm } from "../forms";

export default async function SignUpPage({ params, searchParams }: PageProps<"/[lang]/sign-up">) {
  const lang = langOf((await params).lang);
  const invite = inviteFrom(await searchParams);
  if (await findCurrentUser()) redirect(invite ? `/join/${invite}` : "/");
  const t = DICT[lang].auth;
  return (
    <AuthShell lang={lang} path="/sign-up" title={t.signUpTitle} prompt={t.haveAccount} linkLabel={t.signIn} linkHref={withInvite("/sign-in", invite)}>
      <SignUpForm invite={invite} />
    </AuthShell>
  );
}
