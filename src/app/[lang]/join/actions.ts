"use server";

import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { requestLang } from "@/i18n/server";
import { acceptInvite, createInvite } from "@/server/invites";
import { getCurrentUser } from "@/server/session";
import { toActionError, type ActionResult } from "../action-result";

/** The Owner makes a link; the page builds the full address from where it is opened. */
export async function createInviteAction(): Promise<{ token?: string; error?: string } | null> {
  const me = await getCurrentUser();
  try {
    return { token: (await createInvite(getDb(), me.id, new Date())).token };
  } catch (err) {
    return toActionError(err, await requestLang());
  }
}

export async function acceptInviteAction(token: string): Promise<ActionResult> {
  const me = await getCurrentUser();
  try {
    await acceptInvite(getDb(), me.id, token, new Date());
  } catch (err) {
    return toActionError(err, await requestLang());
  }
  redirect("/");
}
