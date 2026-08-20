import { OpportunityType } from "need4deed-sdk";
import {
  Between,
  ILike,
  In,
  IsNull,
  LessThanOrEqual,
  MoreThanOrEqual,
  Not,
} from "typeorm";
import { describe, expect, it } from "vitest";
import { getOpportunityWhere } from "../../../../server/utils/data/get-opportunity-where";

describe("getOpportunityWhere", () => {
  it("returns an empty object when neither filter nor appointment params are given", () => {
    expect(getOpportunityWhere(undefined)).toEqual({});
  });

  it("applies filter.type/status/search unchanged", () => {
    expect(
      getOpportunityWhere({
        type: ["regular"],
        status: ["opp-active"],
        search: "tutoring",
      } as never),
    ).toEqual({
      type: In(["regular"]),
      status: In(["opp-active"]),
      title: ILike("%tutoring%"),
    });
  });

  it("applies filter.activity unchanged", () => {
    expect(getOpportunityWhere({ activity: ["3"] } as never)).toEqual({
      deal: { dealActivity: { activity: { id: In(["3"]) } } },
    });
  });

  describe("excludeAccompanying", () => {
    it("sets type: Not(ACCOMPANYING) when true and no explicit filter.type is given", () => {
      const where = getOpportunityWhere(undefined, {
        excludeAccompanying: true,
      });
      expect(where).toEqual({ type: Not(OpportunityType.ACCOMPANYING) });
    });

    it("does nothing when false", () => {
      expect(
        getOpportunityWhere(undefined, { excludeAccompanying: false }),
      ).toEqual({});
    });

    it("defers to an explicit filter.type instead of overriding it", () => {
      const where = getOpportunityWhere({ type: ["events"] } as never, {
        excludeAccompanying: true,
      });
      expect(where).toEqual({ type: In(["events"]) });
    });
  });

  describe("appointment date range", () => {
    it("uses MoreThanOrEqual when only appointmentDateFrom is given", () => {
      const where = getOpportunityWhere(undefined, {
        appointmentDateFrom: "2026-06-01",
      });
      expect(where).toEqual({
        onetimer: { date: MoreThanOrEqual(new Date("2026-06-01")) },
      });
    });

    it("uses LessThanOrEqual with an inclusive end-of-day bound when only appointmentDateTo is given", () => {
      const where = getOpportunityWhere(undefined, {
        appointmentDateTo: "2026-06-30",
      });
      const expectedEnd = new Date("2026-06-30");
      expectedEnd.setUTCHours(23, 59, 59, 999);
      expect(where).toEqual({
        onetimer: { date: LessThanOrEqual(expectedEnd) },
      });
    });

    it("uses Between with an inclusive end-of-day upper bound when both are given", () => {
      const where = getOpportunityWhere(undefined, {
        appointmentDateFrom: "2026-06-01",
        appointmentDateTo: "2026-06-30",
      });
      const expectedEnd = new Date("2026-06-30");
      expectedEnd.setUTCHours(23, 59, 59, 999);
      expect(where).toEqual({
        onetimer: {
          date: Between(new Date("2026-06-01"), expectedEnd),
        },
      });
    });

    it("throws BadRequestError on an unparseable date", () => {
      expect(() =>
        getOpportunityWhere(undefined, {
          appointmentDateFrom: "not-a-date",
        }),
      ).toThrow(/Invalid date/);
    });
  });

  describe("hasAppointmentDate", () => {
    it("sets onetimerId: Not(IsNull()) when true and no date range is given", () => {
      const where = getOpportunityWhere(undefined, {
        hasAppointmentDate: true,
      });
      expect(where).toEqual({ onetimerId: Not(IsNull()) });
    });

    it("does nothing when false", () => {
      expect(
        getOpportunityWhere(undefined, { hasAppointmentDate: false }),
      ).toEqual({});
    });

    it("is superseded by an explicit date range instead of being applied redundantly", () => {
      const where = getOpportunityWhere(undefined, {
        hasAppointmentDate: true,
        appointmentDateFrom: "2026-06-01",
      });
      expect(where).toEqual({
        onetimer: { date: MoreThanOrEqual(new Date("2026-06-01")) },
      });
    });
  });
});
