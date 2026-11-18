import type { Db } from "@/db/client";
import { NotFoundError } from "./errors";
import { getMyHousehold } from "./households";

/** The current Member's Household (with its time zone); Members and the Owner alike. */
export async function householdOf(db: Db, userId: string) {
  const household = await getMyHousehold(db, userId);
  if (!household) throw new NotFoundError("Home");
  return household;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** An id from a form or a link; one that cannot be an id is simply not found (rather than a database error). */
export function idOf(id: string, what: string) {
  if (!UUID.test(id)) throw new NotFoundError(what);
  return id;
}
