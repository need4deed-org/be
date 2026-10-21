import { OccasionalType } from "need4deed-sdk";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import DealTimeslot from "../../../data/entity/m2m/deal-timeslot";
import Timeslot from "../../../data/entity/time/timeslot.entity";
import { getNameFields } from "../../../services/dto";
import {
  formatScheduleDe,
  formatScheduleLocalized,
  getAvailability,
} from "../../../services/dto/utils";

describe("getNameFields", () => {
  it("should split a full name into first, middle, and last", () => {
    const result = getNameFields("John Quincy Adams");

    expect(result).toEqual({
      firstName: "John",
      lastName: "Adams",
      middleName: "Quincy",
    });
  });

  it("should handle multiple middle names by joining them", () => {
    const result = getNameFields("Herbert Bedford Fosbury III");

    expect(result).toEqual({
      firstName: "Herbert",
      lastName: "III",
      middleName: "Bedford Fosbury",
    });
  });

  it("should handle only two names (no middle name)", () => {
    const result = getNameFields("Jane Doe");

    expect(result).toEqual({
      firstName: "Jane",
      lastName: "Doe",
      middleName: undefined,
    });
  });

  it("should handle a single name", () => {
    const result = getNameFields("Prince");

    expect(result).toEqual({
      firstName: "Prince",
      lastName: undefined,
      middleName: undefined,
    });
  });

  it("should handle an empty string", () => {
    const result = getNameFields("");

    expect(result).toEqual({
      firstName: undefined,
      lastName: undefined,
      middleName: undefined,
    });
  });
});

describe("formatScheduleDe / formatScheduleLocalized", () => {
  // getTimeSlotForDaytime() derives the hour range via Date#getHours(), which
  // reads the process's local timezone — pin it so these assertions don't
  // depend on where the test runs.
  const ORIGINAL_TZ = process.env.TZ;

  beforeAll(() => {
    process.env.TZ = "UTC";
  });

  afterAll(() => {
    process.env.TZ = ORIGINAL_TZ;
  });

  it("should return an empty string for no timeslots", () => {
    expect(formatScheduleDe([])).toBe("");
  });

  it("should render a recurring weekly slot as weekday + hour range in German", () => {
    const dealTimeslot = [
      new DealTimeslot({
        timeslot: new Timeslot({
          rrule: "FREQ=WEEKLY;BYDAY=MO;",
          start: new Date("2026-01-05T08:00:00Z"),
          end: new Date("2026-01-05T11:00:00Z"),
        }),
      }),
    ];

    expect(formatScheduleDe(dealTimeslot)).toBe("Montag, 08–11 Uhr");
  });

  it("should render an occasional slot in German", () => {
    const dealTimeslot = [
      new DealTimeslot({
        timeslot: new Timeslot({ occasional: OccasionalType.WEEKENDS }),
      }),
    ];

    expect(formatScheduleDe(dealTimeslot)).toBe("gelegentlich, am Wochenende");
  });

  it("should render a one-off slot as a localized date/time string", () => {
    const dealTimeslot = [
      new DealTimeslot({
        timeslot: new Timeslot({ start: new Date("2026-03-05T14:00:00Z") }),
      }),
    ];

    const result = formatScheduleDe(dealTimeslot);

    expect(result).not.toContain("undefined");
    expect(result.length).toBeGreaterThan(0);
  });

  it("should join multiple slots with a comma", () => {
    const dealTimeslot = [
      new DealTimeslot({
        timeslot: new Timeslot({
          rrule: "FREQ=WEEKLY;BYDAY=MO;",
          start: new Date("2026-01-05T08:00:00Z"),
          end: new Date("2026-01-05T11:00:00Z"),
        }),
      }),
      new DealTimeslot({
        timeslot: new Timeslot({ occasional: OccasionalType.WEEKDAYS }),
      }),
    ];

    expect(formatScheduleDe(dealTimeslot)).toBe(
      "Montag, 08–11 Uhr, gelegentlich, wochentags",
    );
  });

  it("should render a recurring weekly slot per language with a neutral hour range", () => {
    const dealTimeslot = [
      new DealTimeslot({
        timeslot: new Timeslot({
          rrule: "FREQ=WEEKLY;BYDAY=MO;",
          start: new Date("2026-01-05T08:00:00Z"),
          end: new Date("2026-01-05T11:00:00Z"),
        }),
      }),
    ];

    expect(formatScheduleLocalized(dealTimeslot)).toEqual({
      en: "Monday, 08:00–11:00",
      de: "Montag, 08:00–11:00",
    });
  });

  it("should render an occasional slot per language", () => {
    const dealTimeslot = [
      new DealTimeslot({
        timeslot: new Timeslot({ occasional: OccasionalType.WEEKENDS }),
      }),
    ];

    expect(formatScheduleLocalized(dealTimeslot)).toEqual({
      en: "on weekends",
      de: "am Wochenende",
    });
  });

  const DAY_DATES: Record<string, string> = {
    MO: "2026-01-05",
    TU: "2026-01-06",
    WE: "2026-01-07",
    TH: "2026-01-08",
    FR: "2026-01-09",
    SA: "2026-01-10",
    SU: "2026-01-11",
  };

  const weekly = (byDay: string, fromHour: string, toHour: string) =>
    new DealTimeslot({
      timeslot: new Timeslot({
        rrule: `FREQ=WEEKLY;BYDAY=${byDay};`,
        start: new Date(`${DAY_DATES[byDay]}T${fromHour}:00:00Z`),
        end: new Date(`${DAY_DATES[byDay]}T${toHour}:00:00Z`),
      }),
    });

  it("should keep the plain list for exactly 3 slots", () => {
    const dealTimeslot = [
      weekly("MO", "14", "17"),
      weekly("TU", "14", "17"),
      weekly("WE", "14", "17"),
    ];

    expect(formatScheduleDe(dealTimeslot)).toBe(
      "Montag, 14–17 Uhr, Dienstag, 14–17 Uhr, Mittwoch, 14–17 Uhr",
    );
  });

  it("should collapse consecutive weekdays sharing a time range into a day range", () => {
    const dealTimeslot = ["FR", "TH", "WE", "TU", "MO"].map((day) =>
      weekly(day, "14", "17"),
    );

    expect(formatScheduleLocalized(dealTimeslot)).toEqual({
      en: "Monday to Friday, 14:00–17:00",
      de: "Montag bis Freitag, 14:00–17:00",
    });
  });

  it("should list non-consecutive days sharing a time range with 'und'", () => {
    const dealTimeslot = [
      weekly("MO", "17", "20"),
      weekly("WE", "17", "20"),
      weekly("FR", "17", "20"),
      weekly("SU", "17", "20"),
    ];

    expect(formatScheduleDe(dealTimeslot)).toBe(
      "Montag, Mittwoch, Freitag und Sonntag, 17–20 Uhr",
    );
  });

  it("should group days by identical time ranges and combine ranges with single days", () => {
    const dealTimeslot = [
      weekly("MO", "08", "11"),
      weekly("MO", "14", "17"),
      weekly("TU", "08", "11"),
      weekly("TU", "14", "17"),
      weekly("WE", "08", "11"),
      weekly("WE", "14", "17"),
      weekly("FR", "08", "11"),
      weekly("FR", "14", "17"),
      weekly("SA", "17", "20"),
    ];

    expect(formatScheduleDe(dealTimeslot)).toBe(
      "Montag bis Mittwoch und Freitag, 08–11 Uhr und 14–17 Uhr; Samstag, 17–20 Uhr",
    );
  });

  it("should append occasional slots after the weekly groups", () => {
    const dealTimeslot = [
      weekly("MO", "08", "11"),
      weekly("TU", "08", "11"),
      weekly("WE", "08", "11"),
      new DealTimeslot({
        timeslot: new Timeslot({ occasional: OccasionalType.WEEKENDS }),
      }),
    ];

    expect(formatScheduleLocalized(dealTimeslot)).toEqual({
      en: "Monday to Wednesday, 08:00–11:00; on weekends",
      de: "Montag bis Mittwoch, 08:00–11:00; am Wochenende",
    });
  });

  it("should throw for a Timeslot with none of occasional/rrule/start", () => {
    const dealTimeslot = [
      new DealTimeslot({ timeslot: new Timeslot({ info: "only info set" }) }),
    ];

    expect(() => formatScheduleDe(dealTimeslot)).toThrow(
      "Timeslot is lacking required fields",
    );
  });

  it("should throw for a weekly rrule with no recognizable BYDAY", () => {
    const dealTimeslot = [
      new DealTimeslot({
        timeslot: new Timeslot({
          rrule: "FREQ=WEEKLY;",
          start: new Date("2026-01-05T08:00:00Z"),
          end: new Date("2026-01-05T11:00:00Z"),
        }),
      }),
    ];

    expect(() => formatScheduleDe(dealTimeslot)).toThrow(
      "Timeslot has a weekly rrule with no recognizable BYDAY",
    );
  });
});

describe("getAvailability one-time slot", () => {
  const ORIGINAL_TZ = process.env.TZ;

  beforeAll(() => {
    process.env.TZ = "UTC";
  });

  afterAll(() => {
    process.env.TZ = ORIGINAL_TZ;
  });

  it.each([
    ["2026-10-22T08:00:00Z", "22. Okt. 2026, 10:00"],
    ["2026-10-28T09:00:00Z", "28. Okt. 2026, 10:00"],
  ])("shows %s in Berlin time", (start, expected) => {
    const [slot] = getAvailability([
      new DealTimeslot({
        timeslot: new Timeslot({ id: 1, start: new Date(start) }),
      }),
    ]);

    expect(slot.daytime).toBe(expected);
  });
});
