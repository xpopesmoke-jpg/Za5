/** When a Chore comes round again: every N days counted from the last completion, or on fixed weekdays (1 = Monday … 7 = Sunday). */
export type Schedule = { kind: "every"; days: number } | { kind: "weekdays"; days: number[] };

/** A calendar day in the home, written "2026-11-17". */
export type Day = string;

/** The calendar day it is at `now` in the given time zone. */
export function localDay(now: Date, timeZone: string): Day {
  // en-CA writes dates as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

const asUtc = (day: Day) => new Date(`${day}T00:00:00Z`);

export function addDays(day: Day, n: number): Day {
  const d = asUtc(day);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Whole days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: Day, to: Day): number {
  return Math.round((asUtc(to).getTime() - asUtc(from).getTime()) / 86_400_000);
}

/** 1 = Monday … 7 = Sunday */
export function weekday(day: Day): number {
  return ((asUtc(day).getUTCDay() + 6) % 7) + 1;
}

/** The first due day of a new Chore: today for an interval, else the next of its weekdays from today on. */
export function firstDue(schedule: Schedule, today: Day): Day {
  return schedule.kind === "every" ? today : nextWeekday(schedule.days, today, 0);
}

/**
 * The next due day once an Occurrence is done on `doneOn`: an interval counts from the completion, however
 * late; fixed weekdays move to the next of those days after it.
 */
export function dueAfterDone(schedule: Schedule, doneOn: Day): Day {
  return schedule.kind === "every" ? addDays(doneOn, schedule.days) : nextWeekday(schedule.days, doneOn, 1);
}

function nextWeekday(days: number[], from: Day, skip: number): Day {
  for (let i = skip; i < skip + 7; i++) {
    const d = addDays(from, i);
    if (days.includes(weekday(d))) return d;
  }
  throw new Error("A weekday schedule needs at least one day.");
}
