"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { SETUP_EXTRA_ROWS } from "@/domain/limits";
import { requestLang } from "@/i18n/server";
import { getCurrentUser } from "@/server/session";
import { saveSetupStep, setupStepAfter, type SetupChoices } from "@/server/walkthrough";
import { text, toActionError, type ActionResult } from "../action-result";


const num = (form: FormData, name: string) => {
  const v = text(form, name);
  return v === "" ? undefined : Number(v);
};

/** Reads one walkthrough step's form: ticked suggestions with their changes, and any extra Chores. */
function choicesFrom(form: FormData): SetupChoices {
  const keep = form.getAll("keep").map((k) => {
    const key = String(k);
    return { key, everyDays: num(form, `every_${key}`), effort: num(form, `effort_${key}`), note: text(form, `note_${key}`) };
  });
  const extra = Array.from({ length: SETUP_EXTRA_ROWS }, (_, i) => ({
    name: text(form, `extra_name_${i}`),
    everyDays: num(form, `extra_every_${i}`) ?? 7,
    effort: num(form, `extra_effort_${i}`) ?? 10,
    note: text(form, `extra_note_${i}`),
  })).filter((e) => e.name);
  return { keep, extra };
}

/** Saves a step and moves on to the next one, worked out here, never taken from the page. `step` is a Room's id or "whole". */
export async function saveSetupAction(step: string, _prev: ActionResult, form: FormData): Promise<ActionResult> {
  const me = await getCurrentUser();
  const lang = await requestLang();
  const roomId = step === "whole" ? null : step;
  let next: string;
  try {
    await saveSetupStep(getDb(), me.id, roomId, choicesFrom(form), lang, new Date());
    next = await setupStepAfter(getDb(), me.id, roomId);
  } catch (err) {
    return toActionError(err, lang);
  }
  revalidatePath("/", "layout");
  redirect(next);
}
