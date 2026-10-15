import { UserRole } from "need4deed-sdk";
import { describe, expect, it } from "vitest";
import {
  assertAppointmentNotTooSoon,
  minAppointmentDate,
} from "../../../../server/utils/data/min-appointment-date";

const TODAY = new Date(2026, 3, 1);
const EARLIEST = new Date("2026-04-13T22:00:00Z");
const JUST_BEFORE = new Date(EARLIEST.getTime() - 60_000);

describe("minAppointmentDate", () => {
  it("is the start of the 7th working day, skipping Easter and the weekend", () => {
    expect(minAppointmentDate(TODAY)).toEqual(EARLIEST);
  });

  it("skips a plain weekend", () => {
    expect(minAppointmentDate(new Date(2026, 5, 4))).toEqual(
      new Date("2026-06-14T22:00:00Z"),
    );
  });
});

describe("assertAppointmentNotTooSoon", () => {
  it("rejects an appointment before the 7th working day", () => {
    expect(() =>
      assertAppointmentNotTooSoon(JUST_BEFORE, UserRole.AGENT, null, TODAY),
    ).toThrow("at least 7 working days");
  });

  it("accepts an appointment on the 7th working day", () => {
    expect(() =>
      assertAppointmentNotTooSoon(EARLIEST, UserRole.AGENT, null, TODAY),
    ).not.toThrow();
  });

  it.each([UserRole.AGENT, UserRole.COORDINATOR])(
    "rejects an invalid date for a %s",
    (role) => {
      expect(() =>
        assertAppointmentNotTooSoon(new Date(NaN), role, null, TODAY),
      ).toThrow("The appointment date is invalid.");
    },
  );

  it("checks a caller without a role", () => {
    expect(() =>
      assertAppointmentNotTooSoon(JUST_BEFORE, undefined, null, TODAY),
    ).toThrow();
  });

  it.each([UserRole.COORDINATOR, UserRole.ADMIN])(
    "lets a %s set any date",
    (role) => {
      expect(() =>
        assertAppointmentNotTooSoon(new Date(2026, 3, 2), role, null, TODAY),
      ).not.toThrow();
    },
  );

  it("allows keeping the current day, at another time", () => {
    expect(() =>
      assertAppointmentNotTooSoon(
        new Date("2026-04-02T12:00:00Z"),
        UserRole.AGENT,
        new Date("2026-04-02T08:00:00Z"),
        TODAY,
      ),
    ).not.toThrow();
  });

  it("checks a moved day even inside the window", () => {
    expect(() =>
      assertAppointmentNotTooSoon(
        new Date("2026-04-07T08:00:00Z"),
        UserRole.AGENT,
        new Date("2026-04-02T08:00:00Z"),
        TODAY,
      ),
    ).toThrow();
  });
});
