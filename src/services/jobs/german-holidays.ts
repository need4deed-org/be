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
  let added = 0;
  while (added < days) {
    result = addDays(result, 1);
    const dow = result.getDay();
    if (dow !== 0 && dow !== 6 && !isGermanPublicHoliday(result)) {
      added++;
    }
  }
  return result;
}

export function berlinToday(): Date {
  const s = new Date().toLocaleDateString("sv-SE", {
    timeZone: "Europe/Berlin",
  });
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}
