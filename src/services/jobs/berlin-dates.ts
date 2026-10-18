import { addWorkingDays } from "need4deed-sdk";
import { berlinTimeZone } from "../../config";

function addDays(date: Date, n: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + n);
}

export function monthsAgo(n: number, now: Date = new Date()): Date {
  const targetMonth = now.getMonth() - n;
  const y = now.getFullYear() + Math.floor(targetMonth / 12);
  const m = ((targetMonth % 12) + 12) % 12;
  const maxDay = new Date(y, m + 1, 0).getDate();
  return new Date(y, m, Math.min(now.getDate(), maxDay));
}

export function berlinDayBoundaries(berlinDate: Date): {
  startOfDay: Date;
  endOfDay: Date;
} {
  const y = berlinDate.getFullYear();
  const m = berlinDate.getMonth();
  const d = berlinDate.getDate();
  const noonUTC = new Date(Date.UTC(y, m, d, 12));
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: berlinTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(noonUTC);
  const get = (type: string) =>
    parseInt(parts.find((p) => p.type === type)!.value, 10);
  const berlinNoonAsUTC = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour") === 24 ? 0 : get("hour"),
    get("minute"),
    get("second"),
  );
  const berlinOffsetMs = berlinNoonAsUTC - noonUTC.getTime();
  return {
    startOfDay: new Date(Date.UTC(y, m, d, 0) - berlinOffsetMs),
    endOfDay: new Date(Date.UTC(y, m, d, 23, 59, 59, 999) - berlinOffsetMs),
  };
}

export function crossedMonthsAgo(
  n: number,
  now: Date = new Date(),
): { from: Date; to: Date } {
  return { from: monthsAgo(n, addDays(now, -1)), to: monthsAgo(n, now) };
}

export function appointmentsDue(
  today: Date,
  workingDaysAhead: number,
): { from: Date; to: Date } {
  const target = addWorkingDays(today, workingDaysAhead);
  return {
    from: berlinDayBoundaries(target).startOfDay,
    to: berlinDayBoundaries(addWorkingDays(target, 1)).startOfDay,
  };
}
