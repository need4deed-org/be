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
import { berlinDayBoundaries } from "../../../../services/jobs/german-holidays";

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

    it("leaves an explicit filter.type that doesn't include accompanying untouched", () => {
      const where = getOpportunityWhere({ type: ["events"] } as never, {
        excludeAccompanying: true,
      });
      expect(where).toEqual({ type: In(["events"]) });
    });

    it("strips accompanying out of an explicit filter.type that includes it, instead of ignoring the flag", () => {
      const where = getOpportunityWhere(
        { type: ["accompanying", "events"] } as never,
        { excludeAccompanying: true },
      );
      expect(where).toEqual({ type: In(["events"]) });
    });
  });

  describe("appointment date range", () => {
    it("uses MoreThanOrEqual anchored to Berlin midnight when only appointmentDateFrom is given", () => {
      const where = getOpportunityWhere(undefined, {
        appointmentDateFrom: "2026-06-01",
      });
      const { startOfDay } = berlinDayBoundaries(new Date(2026, 5, 1));
      expect(where).toEqual({
        onetimer: { date: MoreThanOrEqual(startOfDay) },
      });
    });

    it("uses LessThanOrEqual anchored to the end of the Berlin day when only appointmentDateTo is given", () => {
      const where = getOpportunityWhere(undefined, {
        appointmentDateTo: "2026-06-30",
      });
      const { endOfDay } = berlinDayBoundaries(new Date(2026, 5, 30));
      expect(where).toEqual({
        onetimer: { date: LessThanOrEqual(endOfDay) },
      });
    });

    it("uses Between with Berlin day boundaries when both are given", () => {
      const where = getOpportunityWhere(undefined, {
        appointmentDateFrom: "2026-06-01",
        appointmentDateTo: "2026-06-30",
      });
      const { startOfDay } = berlinDayBoundaries(new Date(2026, 5, 1));
      const { endOfDay } = berlinDayBoundaries(new Date(2026, 5, 30));
      expect(where).toEqual({
        onetimer: { date: Between(startOfDay, endOfDay) },
      });
    });

    it("throws BadRequestError on an unparseable date", () => {
      expect(() =>
        getOpportunityWhere(undefined, {
          appointmentDateFrom: "not-a-date",
        }),
      ).toThrow(/Invalid date/);
    });

    it("throws BadRequestError on an empty string instead of silently skipping validation", () => {
      expect(() =>
        getOpportunityWhere(undefined, { appointmentDateFrom: "" }),
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
      const { startOfDay } = berlinDayBoundaries(new Date(2026, 5, 1));
      expect(where).toEqual({
        onetimer: { date: MoreThanOrEqual(startOfDay) },
      });
    });
  });
});
