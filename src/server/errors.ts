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
