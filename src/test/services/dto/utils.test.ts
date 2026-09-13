import { OccasionalType } from "need4deed-sdk";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import DealTimeslot from "../../../data/entity/m2m/deal-timeslot";
import Timeslot from "../../../data/entity/time/timeslot.entity";
import { getNameFields } from "../../../services/dto";
import {
  formatScheduleBilingual,
  formatScheduleDe,
  getDistrictCentroid,
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

describe("formatScheduleDe / formatScheduleBilingual", () => {
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

  it("should render a recurring weekly slot bilingually with a neutral hour range", () => {
    const dealTimeslot = [
      new DealTimeslot({
        timeslot: new Timeslot({
          rrule: "FREQ=WEEKLY;BYDAY=MO;",
          start: new Date("2026-01-05T08:00:00Z"),
          end: new Date("2026-01-05T11:00:00Z"),
        }),
      }),
    ];

    expect(formatScheduleBilingual(dealTimeslot)).toBe(
      "Montag/Monday, 08:00–11:00",
    );
  });

  it("should render an occasional slot bilingually", () => {
    const dealTimeslot = [
      new DealTimeslot({
        timeslot: new Timeslot({ occasional: OccasionalType.WEEKENDS }),
      }),
    ];

    expect(formatScheduleBilingual(dealTimeslot)).toBe(
      "am Wochenende/on weekends",
    );
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

describe("getDistrictCentroid", () => {
  it("returns null lat/lon for a district with no districtPostcode rows", () => {
    expect(getDistrictCentroid({ districtPostcode: [] })).toEqual({
      latitude: null,
      longitude: null,
    });
  });

  it("returns null lat/lon when the district itself is undefined", () => {
    expect(getDistrictCentroid(undefined)).toEqual({
      latitude: null,
      longitude: null,
    });
  });

  it("averages lat/lon across the district's geocoded postcodes", () => {
    const result = getDistrictCentroid({
      districtPostcode: [
        { postcode: { latitude: 52.4, longitude: 13.3 } },
        { postcode: { latitude: 52.6, longitude: 13.5 } },
      ],
    });
    expect(result.latitude).toBeCloseTo(52.5);
    expect(result.longitude).toBeCloseTo(13.4);
  });

  it("ignores postcodes with no coordinates rather than treating them as 0,0", () => {
    const result = getDistrictCentroid({
      districtPostcode: [
        { postcode: { latitude: 52.4, longitude: 13.3 } },
        { postcode: { latitude: null, longitude: null } },
        { postcode: undefined },
      ],
    });
    expect(result.latitude).toBe(52.4);
    expect(result.longitude).toBe(13.3);
  });
});
