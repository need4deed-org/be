import { getByDayCode } from "./by-day-code";

export function getRRULE(day: string): string | null {
  const code = getByDayCode(day);
  return code ? `FREQ=WEEKLY;BYDAY=${code};` : null;
}
