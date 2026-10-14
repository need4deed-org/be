import { ByDay } from "need4deed-sdk";

export type ByDayCode = keyof typeof ByDay;

// ByDay is declared MO..SU, so a code's index + 1 is its ISO weekday
export const BY_DAY_CODES = Object.keys(ByDay) as ByDayCode[];

const CODE_BY_DAY = new Map(
  Object.entries(ByDay).map(([code, day]) => [day, code as ByDayCode]),
);
const CODE_BY_DAY_LOWER = new Map(
  [...CODE_BY_DAY].map(([day, code]) => [day.toLowerCase(), code]),
);

export function isByDayCode(code: string): code is ByDayCode {
  return Object.hasOwn(ByDay, code);
}

export function getIsoDay(code: ByDayCode): number {
  return BY_DAY_CODES.indexOf(code) + 1;
}

// case-insensitive day name ("monday") -> "MO"
export function getByDayCode(day: string): ByDayCode | null {
  return typeof day === "string"
    ? (CODE_BY_DAY_LOWER.get(day.toLowerCase()) ?? null)
    : null;
}

// exact ByDay value ("Monday") -> "MO"
export function getByDayCodeExact(day: string): ByDayCode | null {
  return CODE_BY_DAY.get(day as ByDay) ?? null;
}
