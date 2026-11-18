import Link from "next/link";
import { getDb } from "@/db/client";
import { ActionForm } from "@/components/action-form";
import { Button } from "@/components/ui";
import { DICT } from "@/i18n/dictionary";
import { langOf } from "@/i18n/server";
import { getMyHousehold } from "@/server/households";
import { getInvite } from "@/server/invites";
import { findCurrentUser } from "@/server/session";
import { acceptInviteAction } from "../actions";
import { withInvite } from "../../invite-param";

const linkButton = "flex min-h-12 items-center justify-center rounded-full border-2 border-edge px-6 text-[16px] font-extrabold";

/** Where an invite link lands: who invited you to which home, then sign up, sign in or join. */
export default async function JoinPage({ params }: PageProps<"/[lang]/join/[token]">) {
  const { lang: raw, token } = await params;
  const lang = langOf(raw);
  const t = DICT[lang].invite;
  const invite = await getInvite(getDb(), token, new Date());
  const me = await findCurrentUser();
  const inHome = me ? await getMyHousehold(getDb(), me.id) : null;
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-5 py-10">
      <p className="font-display text-[22px] font-extrabold">Za5</p>
      {!invite ? (
        <>
          <p className="text-[17px] font-semibold">{t.linkNotValid}</p>
          {me && <Link href="/" className={`${linkButton} bg-surface`}>{t.backHome}</Link>}
        </>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <h1 className="text-[32px]">{t.joinTitle(invite.householdName)}</h1>
            <p className="text-[16px] text-ink-2">{t.joinBody(invite.invitedBy ?? "Za5")}</p>
          </div>
          {inHome ? (
            <>
              <p className="text-[16px] font-semibold">{t.alreadyHome}</p>
              <Link href="/" className={`${linkButton} bg-surface`}>{t.backHome}</Link>
            </>
          ) : me ? (
            <ActionForm action={acceptInviteAction.bind(null, token)} className="flex flex-col gap-3">
              <Button type="submit">{t.join}</Button>
            </ActionForm>
          ) : (
            <div className="flex flex-col gap-3">
              <Link href={withInvite("/sign-up", token)} className={`${linkButton} bg-accent text-accent-ink`}>{t.createAccount}</Link>
              <Link href={withInvite("/sign-in", token)} className={`${linkButton} bg-surface`}>{t.haveAccount}</Link>
            </div>
          )}
        </>
      )}
    </main>
  );
}
