import { OccasionalType } from "need4deed-sdk";
import { describe, expect, it } from "vitest";
import DealTimeslot from "../../../data/entity/m2m/deal-timeslot";
import Timeslot from "../../../data/entity/time/timeslot.entity";
import { getNameFields } from "../../../services/dto";
import { formatScheduleDe } from "../../../services/dto/utils";

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

describe("formatScheduleDe", () => {
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
      "Montag, 08–11 Uhr, gelegentlich, werktags",
    );
  });
});
