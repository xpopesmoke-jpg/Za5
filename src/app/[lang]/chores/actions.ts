"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import type { Schedule } from "@/domain/schedule";
import { requestLang } from "@/i18n/server";
import { addChore, completeOccurrence, skipOccurrence } from "@/server/chores";
import { setAway } from "@/server/away";
import { za5Occurrence } from "@/server/za5";
import { claimOccurrence, dismissDoneForYou, unclaimOccurrence } from "@/server/claims";
import { NotAllowedError, NotFoundError, ValidationError } from "@/server/errors";
import { getCurrentUser } from "@/server/session";
import { text, toActionError, type ActionResult } from "../action-result";

/** Done on Today's list: credits whoever tapped it. */
export async function completeAction(occurrenceId: string): Promise<void> {
  await quietly((me) => completeOccurrence(getDb(), me, occurrenceId, new Date()));
}

/**
 * Runs a tap on Today's list. When someone else got there first (already done, already claimed) the list
 * simply refreshes and shows how things stand, which is the answer the person needs.
 */
async function quietly(run: (me: string) => Promise<unknown>) {
  const me = await getCurrentUser();
  try {
    await run(me.id);
  } catch (err) {
    if (!(err instanceof ValidationError || err instanceof NotFoundError || err instanceof NotAllowedError)) throw err;
  }
  revalidatePath("/", "layout");
}

export async function claimAction(occurrenceId: string): Promise<void> {
  await quietly((me) => claimOccurrence(getDb(), me, occurrenceId, new Date()));
}

export async function unclaimAction(occurrenceId: string): Promise<void> {
  await quietly((me) => unclaimOccurrence(getDb(), me, occurrenceId, new Date()));
}

export async function dismissDoneForYouAction(occurrenceId: string): Promise<void> {
  await quietly((me) => dismissDoneForYou(getDb(), me, occurrenceId, new Date()));
}

/** "whole", "room:<id>" or "fixture:<id>" from the Where picker. */
function placeFrom(form: FormData) {
  const [kind, id] = text(form, "place").split(":");
  if (kind === "fixture") return { fixtureId: id };
  if (kind === "room") return { roomId: id };
  return {};
}

function scheduleFrom(form: FormData): Schedule {
  if (text(form, "scheduleKind") === "weekdays") {
    return { kind: "weekdays", days: form.getAll("weekdays").map(Number) };
  }
  return { kind: "every", days: Number(text(form, "everyDays")) };
}

export async function addChoreAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const me = await getCurrentUser();
  const lang = await requestLang();
  try {
    await addChore(
      getDb(),
      me.id,
      { name: text(form, "name"), note: text(form, "note"), effort: Number(text(form, "effort")), schedule: scheduleFrom(form), ...placeFrom(form) },
      new Date(),
    );
  } catch (err) {
    return toActionError(err, lang);
  }
  revalidatePath("/", "layout");
  // The proxy keeps the person in their language.
  redirect("/");
}

export async function skipAction(occurrenceId: string): Promise<void> {
  await quietly((me) => skipOccurrence(getDb(), me, occurrenceId, new Date()));
}

export async function za5Action(occurrenceId: string, when: "later" | "tomorrow"): Promise<void> {
  await quietly((me) => za5Occurrence(getDb(), me, occurrenceId, when === "later" ? "later" : "tomorrow", new Date()));
}

export async function setAwayAction(away: boolean): Promise<void> {
  await quietly((me) => setAway(getDb(), me, away, new Date()));
}
