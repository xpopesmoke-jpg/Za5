import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { createAuth, type Auth } from "./auth";
import { getMyHousehold, type MyHousehold } from "./households";

const globalForAuth = globalThis as unknown as { __za5Auth?: Auth };

/** The login system, created on first use. */
export function getAuth(): Auth {
  globalForAuth.__za5Auth ??= createAuth(getDb());
  return globalForAuth.__za5Auth;
}

export type CurrentUser = { id: string; name: string; email: string };

/** The signed-in person, or null. */
export async function findCurrentUser(): Promise<CurrentUser | null> {
  const session = await getAuth().api.getSession({ headers: await headers() });
  return session ? { id: session.user.id, name: session.user.name, email: session.user.email } : null;
}

/** The signed-in person. Sends them to sign in if nobody is signed in. */
export async function getCurrentUser(): Promise<CurrentUser> {
  return (await findCurrentUser()) ?? redirect("/sign-in");
}

/** The signed-in person and their Household. Sends them to sign in, or to name their home, as needed. */
export async function getCurrentHome(): Promise<{ me: CurrentUser; household: MyHousehold }> {
  const me = await getCurrentUser();
  const household = await getMyHousehold(getDb(), me.id);
  if (!household) redirect("/new-home");
  return { me, household };
}
