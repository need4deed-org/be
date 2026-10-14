import { ByDay } from "need4deed-sdk";

export type ByDayCode = keyof typeof ByDay;

const CODE_BY_DAY = new Map(
  Object.entries(ByDay).map(([code, day]) => [
    day.toLowerCase(),
    code as ByDayCode,
  ]),
);

export function getByDayCode(day: string): ByDayCode | null {
  return typeof day === "string"
    ? (CODE_BY_DAY.get(day.toLowerCase()) ?? null)
    : null;
}
