"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/db/client";
import { DICT } from "@/i18n/dictionary";
import { requestLang } from "@/i18n/server";
import { addFixture, addFloor, addRoom, removeFixture, removeFloor, removeRoom, renameFloor, renameRoom } from "@/server/home";
import type { FixtureType, RoomType } from "@/server/home-types";
import { getCurrentUser } from "@/server/session";
import { text, toActionError, type ActionResult } from "../action-result";

/** Runs one change to the home for the signed-in person and refreshes every screen that shows it. */
async function change(run: (userId: string) => Promise<unknown>): Promise<ActionResult> {
  const me = await getCurrentUser();
  try {
    await run(me.id);
  } catch (err) {
    return toActionError(err, await requestLang());
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

// The server layer checks both types; a bad value from the form becomes "Pick a room type." / "Pick a fixture."
const roomTypeFrom = (form: FormData) => text(form, "type") as RoomType;

/** A blank name takes the type's name in the person's language ("Kitchen", "Kuhinja"). */
async function roomNameFrom(form: FormData, type: RoomType) {
  return text(form, "name") || DICT[await requestLang()].rooms.roomTypes[type] || "";
}

export async function addRoomAction(floorId: string, _prev: ActionResult, form: FormData) {
  return change(async (me) => {
    const type = roomTypeFrom(form);
    await addRoom(getDb(), me, floorId, { type, name: await roomNameFrom(form, type) });
  });
}

export async function renameRoomAction(roomId: string, _prev: ActionResult, form: FormData) {
  return change(async (me) => {
    const type = roomTypeFrom(form);
    await renameRoom(getDb(), me, roomId, { type, name: await roomNameFrom(form, type) });
  });
}

export async function removeRoomAction(roomId: string) {
  return change((me) => removeRoom(getDb(), me, roomId));
}

export async function addFixtureAction(roomId: string, _prev: ActionResult, form: FormData) {
  return change(async (me) => {
    await addFixture(getDb(), me, roomId, text(form, "fixture") as FixtureType);
  });
}

export async function removeFixtureAction(fixtureId: string) {
  return change((me) => removeFixture(getDb(), me, fixtureId));
}

export async function addFloorAction() {
  return change((me) => addFloor(getDb(), me));
}

export async function renameFloorAction(floorId: string, _prev: ActionResult, form: FormData) {
  return change((me) => renameFloor(getDb(), me, floorId, text(form, "name")));
}

export async function removeFloorAction(floorId: string) {
  return change((me) => removeFloor(getDb(), me, floorId));
}
