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
import { QuerystringOpportunityFiltering } from "../../../../server/types";
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

  it("keeps every deal constraint when several are combined", () => {
    const where = getOpportunityWhere({
      type: "",
      status: "",
      language: "1",
      district: "2",
      activity: "3",
      skill: "4",
    });

    expect(where.deal).toEqual({
      dealLanguage: { language: { id: "1" } },
      dealDistrict: { district: { id: "2" } },
      dealActivity: { activity: { id: "3" } },
      dealSkill: { skill: { id: "4" } },
    });
  });

  // Multiple selections arrive as an array at runtime (?language=3&language=4)
  // and become In([...]), which TypeORM ORs. The querystring type declares
  // every filter as `string`, hence the cast, see the
  // `// TODO: what about arrays?` above QuerystringOpportunityFiltering.
  it("ORs multiple values within a single filter", () => {
    const where = getOpportunityWhere({
      type: "",
      status: "",
      language: ["3", "4"],
    } as unknown as QuerystringOpportunityFiltering["filter"]);

    expect(where.deal).toEqual({
      dealLanguage: { language: { id: In(["3", "4"]) } },
    });
  });

  it("applies only the language constraint when nothing else is selected", () => {
    const where = getOpportunityWhere({ type: "", status: "", language: "3" });

    expect(where.deal).toEqual({
      dealLanguage: { language: { id: "3" } },
    });
  });

  // be#888's own repro: activity alone matched 1 row; activity plus a
  // non-matching language still matched that same 1, because the language
  // spread silently overwrote the activity spread on the shared `deal` key.
  // Asserting both constraints survive together is the unit-level proof that
  // no longer happens.
  it("keeps both activity and language when combined, matching be#888's repro", () => {
    const activityOnly = getOpportunityWhere({
      type: "",
      status: "",
      activity: "3",
    });
    expect(activityOnly.deal).toEqual({
      dealActivity: { activity: { id: "3" } },
    });

    const activityPlusLanguage = getOpportunityWhere({
      type: "",
      status: "",
      activity: "3",
      language: "9",
    });
    expect(activityPlusLanguage.deal).toEqual({
      dealActivity: { activity: { id: "3" } },
      dealLanguage: { language: { id: "9" } },
    });
  });
});
