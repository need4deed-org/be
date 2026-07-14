import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  addWorkingDays,
  berlinToday,
  isGermanPublicHoliday,
} from "../../../services/jobs/german-holidays";

// Known Easter dates for reference years
// 2024: Mar 31  2025: Apr 20  2026: Apr 5  2023: Apr 9
const d = (y: number, m: number, day: number) => new Date(y, m - 1, day);

describe("isGermanPublicHoliday", () => {
  describe("fixed federal holidays", () => {
    it.each([
      ["Neujahr", d(2026, 1, 1)],
      ["Tag der Arbeit", d(2026, 5, 1)],
      ["Tag der Deutschen Einheit", d(2026, 10, 3)],
      ["1. Weihnachtstag", d(2026, 12, 25)],
      ["2. Weihnachtstag", d(2026, 12, 26)],
    ])("%s is a holiday", (_name, date) => {
      expect(isGermanPublicHoliday(date)).toBe(true);
    });
  });

  describe("Berlin state holiday", () => {
    it("Internationaler Frauentag (Mar 8) is a holiday", () => {
      expect(isGermanPublicHoliday(d(2026, 3, 8))).toBe(true);
    });
  });

  describe("Easter-based holidays", () => {
    // 2026: Easter Sunday = Apr 5
    it.each([
      ["Karfreitag 2026", d(2026, 4, 3)],
      ["Ostermontag 2026", d(2026, 4, 6)],
      ["Christi Himmelfahrt 2026", d(2026, 5, 14)],
      ["Pfingstmontag 2026", d(2026, 5, 25)],
    ])("%s is a holiday", (_name, date) => {
      expect(isGermanPublicHoliday(date)).toBe(true);
    });

    // 2025: Easter Sunday = Apr 20
    it.each([
      ["Karfreitag 2025", d(2025, 4, 18)],
      ["Ostermontag 2025", d(2025, 4, 21)],
      ["Christi Himmelfahrt 2025", d(2025, 5, 29)],
      ["Pfingstmontag 2025", d(2025, 6, 9)],
    ])("%s is a holiday", (_name, date) => {
      expect(isGermanPublicHoliday(date)).toBe(true);
    });

    // 2024: Easter Sunday = Mar 31
    it.each([
      ["Karfreitag 2024", d(2024, 3, 29)],
      ["Ostermontag 2024", d(2024, 4, 1)],
      ["Christi Himmelfahrt 2024", d(2024, 5, 9)],
      ["Pfingstmontag 2024", d(2024, 5, 20)],
    ])("%s is a holiday", (_name, date) => {
      expect(isGermanPublicHoliday(date)).toBe(true);
    });
  });

  describe("regular working days", () => {
    it.each([
      d(2026, 1, 2), // Friday after Neujahr
      d(2026, 4, 7), // Tuesday after Ostermontag
      d(2026, 7, 1), // mid-summer Wednesday
      d(2026, 12, 24), // Heiligabend (NOT a public holiday)
    ])("%s is not a holiday", (date) => {
      expect(isGermanPublicHoliday(date)).toBe(false);
    });

    it("Heiligabend (Dec 24) is not a public holiday", () => {
      expect(isGermanPublicHoliday(d(2026, 12, 24))).toBe(false);
    });
  });
});

describe("addWorkingDays", () => {
  it("skips weekends", () => {
    // Friday 2026-01-02 + 1 working day = Monday 2026-01-05
    const result = addWorkingDays(d(2026, 1, 2), 1);
    expect(result).toEqual(d(2026, 1, 5));
  });

  it("skips weekends when subtracting days", () => {
    // Monday 2026-01-05 - 1 working day = Friday 2026-01-02
    const result = addWorkingDays(d(2026, 1, 5), -1);
    expect(result).toEqual(d(2026, 1, 2));
  });

  it("skips Saturday and Sunday when spanning a weekend", () => {
    // Thursday 2026-01-08 + 2 working days = Monday 2026-01-12
    const result = addWorkingDays(d(2026, 1, 8), 2);
    expect(result).toEqual(d(2026, 1, 12));
  });

  it("skips public holidays", () => {
    // Thursday 2026-04-02 + 1 working day skips Karfreitag (Apr 3) → Monday Apr 6
    // (Ostermontag Apr 6 is also a holiday → Tuesday Apr 7)
    const result = addWorkingDays(d(2026, 4, 2), 1);
    expect(result).toEqual(d(2026, 4, 7));
  });

  it("4 working days across Easter weekend", () => {
    // Mon 2026-03-30: day1=Mar31, day2=Apr1, day3=Apr2,
    // then skip Karfreitag Apr3, skip weekend Apr4-5, skip Ostermontag Apr6
    // day4=Apr7
    const result = addWorkingDays(d(2026, 3, 30), 4);
    expect(result).toEqual(d(2026, 4, 7));
  });

  it("adding 0 working days returns the same day", () => {
    const result = addWorkingDays(d(2026, 6, 10), 0);
    expect(result).toEqual(d(2026, 6, 10));
  });

  it("does not count the start date itself", () => {
    // Monday + 1 = Tuesday
    const result = addWorkingDays(d(2026, 6, 1), 1);
    expect(result).toEqual(d(2026, 6, 2));
  });
});

describe("berlinToday", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the current Berlin calendar date as a local Date", () => {
    // Freeze to a known UTC time: 2026-07-01T22:30:00Z = 2026-07-02 in Berlin (UTC+2)
    vi.setSystemTime(new Date("2026-07-01T22:30:00Z"));
    const result = berlinToday();
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(6); // July = 6 (0-indexed)
    expect(result.getDate()).toBe(2);
  });

  it("returns the same day when UTC and Berlin date match", () => {
    // 2026-07-01T10:00:00Z = 2026-07-01 12:00 Berlin
    vi.setSystemTime(new Date("2026-07-01T10:00:00Z"));
    const result = berlinToday();
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(6);
    expect(result.getDate()).toBe(1);
  });
});
