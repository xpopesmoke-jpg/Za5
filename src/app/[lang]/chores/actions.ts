"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import type { Schedule } from "@/domain/schedule";
import { requestLang } from "@/i18n/server";
import { addChore, completeOccurrence } from "@/server/chores";
import { NotFoundError, ValidationError } from "@/server/errors";
import { getCurrentUser } from "@/server/session";
import { text, toActionError, type ActionResult } from "../action-result";

/**
 * Done on Today's list: credits whoever tapped it. If someone else got there first ("already done") the list
 * simply refreshes, which is the answer the person needs.
 */
export async function completeAction(occurrenceId: string): Promise<void> {
  const me = await getCurrentUser();
  try {
    await completeOccurrence(getDb(), me.id, occurrenceId, new Date());
  } catch (err) {
    if (!(err instanceof ValidationError || err instanceof NotFoundError)) throw err;
  }
  revalidatePath("/", "layout");
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
