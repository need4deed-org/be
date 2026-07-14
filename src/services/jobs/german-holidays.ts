function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month, day);
}

function addDays(date: Date, n: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + n);
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isGermanPublicHoliday(date: Date): boolean {
  const y = date.getFullYear();
  const easter = easterSunday(y);

  const holidays = [
    new Date(y, 0, 1), // Neujahr
    new Date(y, 2, 8), // Internationaler Frauentag (Berlin)
    new Date(y, 4, 1), // Tag der Arbeit
    new Date(y, 9, 3), // Tag der Deutschen Einheit
    new Date(y, 11, 25), // 1. Weihnachtstag
    new Date(y, 11, 26), // 2. Weihnachtstag
    addDays(easter, -2), // Karfreitag
    addDays(easter, 1), // Ostermontag
    addDays(easter, 39), // Christi Himmelfahrt
    addDays(easter, 50), // Pfingstmontag
  ];

  return holidays.some((h) => sameDay(h, date));
}

export function addWorkingDays(from: Date, days: number): Date {
  let result = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const direction = days < 0 ? -1 : 1;
  const remaining = Math.abs(days);
  let added = 0;
  while (added < remaining) {
    result = addDays(result, direction);
    const dow = result.getDay();
    if (dow !== 0 && dow !== 6 && !isGermanPublicHoliday(result)) {
      added++;
    }
  }
  return result;
}

// Returns a Date n calendar months before now, clamping the day to the last
// day of the target month to avoid setMonth overflow (e.g. Apr 30 - 2 months
// should be Feb 28, not Mar 2).
export function monthsAgo(n: number): Date {
  const now = new Date();
  const targetMonth = now.getMonth() - n;
  const y = now.getFullYear() + Math.floor(targetMonth / 12);
  const m = ((targetMonth % 12) + 12) % 12;
  const maxDay = new Date(y, m + 1, 0).getDate();
  return new Date(y, m, Math.min(now.getDate(), maxDay));
}

export function berlinToday(): Date {
  const s = new Date().toLocaleDateString("sv-SE", {
    timeZone: "Europe/Berlin",
  });
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// Returns UTC timestamps for the start and end of the given Berlin calendar day.
// Necessary because Node.js `new Date(y, m, d)` uses the process-local timezone
// (UTC on AWS), so it would not correctly represent Berlin midnight.
export function berlinDayBoundaries(berlinDate: Date): {
  startOfDay: Date;
  endOfDay: Date;
} {
  const y = berlinDate.getFullYear();
  const m = berlinDate.getMonth();
  const d = berlinDate.getDate();
  // Sample the Berlin UTC offset at noon on the target day.
  // DST transitions happen at 02:00 in Europe, so noon is always post-transition.
  // We use formatToParts (not toLocaleString + new Date()) because toLocaleString
  // + new Date() parsing is implementation-defined and produces wrong offsets on
  // non-UTC developer machines. formatToParts extracts numeric field values
  // independently of the process local timezone.
  const noonUTC = new Date(Date.UTC(y, m, d, 12));
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Berlin",
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
  // Treating the Berlin wall-clock values as UTC gives us a timestamp we can
  // subtract from noonUTC to obtain the Berlin UTC offset in milliseconds.
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
