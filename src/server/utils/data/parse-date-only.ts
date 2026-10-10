import { BadRequestError } from "../../../config/error";

export function parseDateOnly(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    throw new BadRequestError(`Invalid date: "${value}"`);
  }
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(year, month - 1, day);
  // `new Date` rolls impossible dates over (2026-02-31 → 2026-03-03).
  if (date.getMonth() !== month - 1 || date.getDate() !== day) {
    throw new BadRequestError(`Invalid date: "${value}"`);
  }
  return date;
}
