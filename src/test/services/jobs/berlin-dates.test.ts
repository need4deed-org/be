import { isWorkingDay } from "need4deed-sdk";
import { describe, expect, it } from "vitest";
import {
  appointmentsDue,
  berlinDayBoundaries,
  crossedMonthsAgo,
  monthsAgo,
} from "../../../services/jobs/berlin-dates";

describe("crossedMonthsAgo", () => {
  it("ends at the threshold and starts at yesterday's", () => {
    const now = new Date(2026, 9, 3, 6);
    expect(crossedMonthsAgo(2, now)).toEqual({
      from: new Date(2026, 7, 2),
      to: new Date(2026, 7, 3),
    });
  });

  it("tiles the calendar: no gaps, no overlaps, month ends included", () => {
    let day = new Date(2027, 0, 1, 6);
    while (day.getFullYear() < 2029) {
      const next = new Date(
        day.getFullYear(),
        day.getMonth(),
        day.getDate() + 1,
        6,
      );
      const today = crossedMonthsAgo(2, day);
      const tomorrow = crossedMonthsAgo(2, next);

      expect(today.from.getTime()).toBeLessThanOrEqual(today.to.getTime());
      expect(tomorrow.from).toEqual(today.to);
      expect(today.to).toEqual(monthsAgo(2, day));
      day = next;
    }
  });

  it("gives a clamped day an empty range instead of a repeat", () => {
    const range = crossedMonthsAgo(2, new Date(2027, 3, 30, 6));
    expect(range.from).toEqual(range.to);
  });
});

describe("appointmentsDue", () => {
  const berlinMidnight = (y: number, m: number, day: number) =>
    berlinDayBoundaries(new Date(y, m, day)).startOfDay;

  it("takes a weekend with the Friday before it", () => {
    expect(appointmentsDue(new Date(2026, 9, 5), 4)).toEqual({
      from: berlinMidnight(2026, 9, 9),
      to: berlinMidnight(2026, 9, 12),
    });
  });

  it("takes a weekday holiday with the working day before it", () => {
    expect(appointmentsDue(new Date(2026, 11, 18), 4)).toEqual({
      from: berlinMidnight(2026, 11, 24),
      to: berlinMidnight(2026, 11, 28),
    });
  });

  it("covers every calendar day once across consecutive working days", () => {
    let day = new Date(2027, 0, 1);
    let previous: { from: Date; to: Date } | undefined;
    while (day.getFullYear() < 2029) {
      if (isWorkingDay(day)) {
        const range = appointmentsDue(day, 4);
        expect(range.from.getTime()).toBeLessThan(range.to.getTime());
        if (previous) {
          expect(range.from).toEqual(previous.to);
        }
        previous = range;
      }
      day = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1);
    }
  });
});
