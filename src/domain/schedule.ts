/** When a Chore comes round again: every N days counted from the last completion, or on fixed weekdays (1 = Monday … 7 = Sunday). */
export type Schedule = { kind: "every"; days: number } | { kind: "weekdays"; days: number[] };

/** A calendar day in the home, written "2026-11-17". */
export type Day = string;

/** The calendar day it is at `now` in the given time zone. */
export function localDay(now: Date, timeZone: string): Day {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const part = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

/** The moment that is `hour:minute` on `day` in the given time zone (DST-safe). */
export function zonedTime(day: Day, hour: number, minute: number, timeZone: string): Date {
  const [y, m, d] = day.split("-").map(Number);
  const wanted = Date.UTC(y, m - 1, d, hour, minute);
  let guess = wanted;
  // Twice: once to learn the zone's offset, once more in case that offset changes across the guess (DST).
  for (let i = 0; i < 2; i++) {
    const parts = new Intl.DateTimeFormat("en-GB", { timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).formatToParts(new Date(guess));
    const get = (type: string) => Number(parts.find((p) => p.type === type)!.value);
    const shown = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"));
    guess += wanted - shown;
  }
  return new Date(guess);
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
 * The next due day once an Occurrence due on `dueOn` is done on `doneOn`. An interval counts from the
 * completion, however late or early. Fixed weekdays move to the next of those days after both the due day and
 * the day it was done, so done late it skips the days that passed, and done early it is never due again on the
 * day it was already done for.
 */
export function dueAfterDone(schedule: Schedule, dueOn: Day, doneOn: Day): Day {
  if (schedule.kind === "every") return addDays(doneOn, schedule.days);
  return nextWeekday(schedule.days, dueOn > doneOn ? dueOn : doneOn, 1);
}

/** How a Schedule is kept in a Chore's row. */
export type ScheduleColumns = { scheduleKind: Schedule["kind"]; everyDays: number | null; weekdays: number[] | null };

export function scheduleToColumns(schedule: Schedule): ScheduleColumns {
  return schedule.kind === "every"
    ? { scheduleKind: "every", everyDays: schedule.days, weekdays: null }
    : { scheduleKind: "weekdays", everyDays: null, weekdays: schedule.days };
}

export function scheduleFromColumns(row: ScheduleColumns): Schedule {
  return row.scheduleKind === "every" ? { kind: "every", days: row.everyDays ?? 1 } : { kind: "weekdays", days: row.weekdays ?? [] };
}

function nextWeekday(days: number[], from: Day, skip: number): Day {
  for (let i = skip; i < skip + 7; i++) {
    const d = addDays(from, i);
    if (days.includes(weekday(d))) return d;
  }
  throw new Error("A weekday schedule needs at least one day.");
}
