/** Something the person asked for that isn't theirs, or doesn't exist. */
export class NotFoundError extends Error {
  constructor(what = "That item") {
    super(`${what} wasn't found.`);
  }
}

/** Input that doesn't make sense. The message is safe to show to the person. */
export class ValidationError extends Error {}

/** Something this Member may not do, such as a Member changing the home (only the Owner can). */
export class NotAllowedError extends Error {}

/** Postgres refused a row because it would break a unique rule (code 23505), possibly wrapped by the driver. */
export function isUniqueViolation(err: unknown): boolean {
  for (let e = err as { code?: string; cause?: unknown } | undefined; e; e = e.cause as typeof e) {
    if (e.code === "23505") return true;
  }
  return false;
}
