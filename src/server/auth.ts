import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import type { Db } from "@/db/client";
import * as schema from "@/db/schema";

type AuthOptions = { secret?: string; baseURL?: string };

/** Login setup: anyone can sign up with email and password, then names their home or joins one by invite. */
export function createAuth(db: Db, options: AuthOptions = {}) {
  return betterAuth({
    secret: options.secret ?? process.env.BETTER_AUTH_SECRET,
    baseURL: options.baseURL ?? process.env.BETTER_AUTH_URL,
    database: drizzleAdapter(db, { provider: "pg", schema }),
    emailAndPassword: { enabled: true, minPasswordLength: 8 },
    session: {
      // Stay signed in on your phone for 60 days, refreshed while you keep using the app.
      expiresIn: 60 * 60 * 24 * 60,
      updateAge: 60 * 60 * 24,
    },
    plugins: [nextCookies()],
  });
}

export type Auth = ReturnType<typeof createAuth>;
