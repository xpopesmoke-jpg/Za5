import { APIError } from "better-auth/api";
import { NotFoundError, ValidationError } from "@/server/errors";
import { localizeError } from "@/i18n/errors";
import type { Lang } from "@/i18n/config";

export type ActionResult = { error?: string } | null;

/** Turns an expected error into a message the person can read in their language; rethrows anything else. */
export function toActionError(err: unknown, lang: Lang): ActionResult {
  if (err instanceof ValidationError || err instanceof NotFoundError) return { error: localizeError(lang, err.message) };
  if (err instanceof APIError) return { error: localizeError(lang, "That didn't work. Try again.") };
  // Next.js uses thrown errors for redirects; let those through.
  throw err;
}

export const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
