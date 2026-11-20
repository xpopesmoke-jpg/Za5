"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { requestLang } from "@/i18n/server";
import { claudePlanReader } from "@/server/claude-plan-reader";
import { NotAllowedError, NotFoundError, ValidationError } from "@/server/errors";
import { hasAnyChore } from "@/server/chores";
import { unlimitedEmails } from "@/server/plan-config";
import { planStore } from "@/server/plan-store";
import { applyPlanDraft, deletePlan, readPlan } from "@/server/plans";
import { getCurrentUser } from "@/server/session";
import { toActionError, type ActionResult } from "../action-result";

/** Reads the Plan with Claude. When Claude itself fails (busy, cut off), the page shows the failed Plan; it didn't count. */
export async function readPlanAction(): Promise<ActionResult> {
  const me = await getCurrentUser();
  const lang = await requestLang();
  try {
    await readPlan(getDb(), me.id, { reader: claudePlanReader(), store: planStore(), unlimitedEmails: unlimitedEmails() }, lang, new Date());
  } catch (err) {
    if (err instanceof ValidationError || err instanceof NotFoundError || err instanceof NotAllowedError) return toActionError(err, lang);
    // the page now says the reading didn't work and didn't count
    console.error("Plan reading failed:", err);
    revalidatePath("/plan");
    return { ok: false };
  }
  revalidatePath("/plan");
  return { ok: true };
}

/** "Looks right" saves the draft and goes on to the room-by-room chores (or home, if chores exist); "Fix it" opens the room editor. */
export async function applyPlanAction(then: "home" | "fix"): Promise<ActionResult> {
  const me = await getCurrentUser();
  try {
    await applyPlanDraft(getDb(), me.id, await requestLang());
  } catch (err) {
    return toActionError(err, await requestLang());
  }
  revalidatePath("/", "layout");
  redirect(then === "fix" ? "/rooms" : (await hasAnyChore(getDb(), me.id)) ? "/" : "/setup");
}

export async function deletePlanAction(): Promise<ActionResult> {
  const me = await getCurrentUser();
  try {
    await deletePlan(getDb(), me.id, planStore());
  } catch (err) {
    return toActionError(err, await requestLang());
  }
  revalidatePath("/plan");
  return { ok: true };
}
