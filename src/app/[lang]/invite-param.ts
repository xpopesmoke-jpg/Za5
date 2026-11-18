import { isInviteToken } from "@/server/invites";

/** The invite token in ?invite=, if it has a token's shape. */
export function inviteFrom(searchParams: Record<string, string | string[] | undefined>): string | undefined {
  const value = searchParams.invite;
  return typeof value === "string" && isInviteToken(value) ? value : undefined;
}

/** A sign-in or sign-up address that keeps the invite with it. */
export const withInvite = (path: string, invite: string | undefined) => (invite ? `${path}?invite=${invite}` : path);
