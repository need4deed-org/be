import { OpportunityType } from "need4deed-sdk";
import { describe, expect, it } from "vitest";
import {
  isGermanOpportunity,
  matchScore,
} from "../../../../server/utils/data/recommended-matches";

const slot = (rrule: string) => ({
  timeslot: {
    id: 1,
    rrule,
    start: new Date("2026-01-05T07:00:00Z"),
    end: new Date("2026-01-05T10:00:00Z"),
  },
});

describe("isGermanOpportunity", () => {
  it.each([
    ["title", { title: "Deutschkurs am Abend" }],
    ["description", { title: "Treffen", info: "We practise German together" }],
  ])("detects German mentioned in the %s", (_, fields) => {
    const opportunity = {
      type: OpportunityType.REGULAR,
      deal: null,
      ...fields,
    };
    expect(isGermanOpportunity(opportunity as any)).toBe(true);
  });

  it("reads the confidential description for accompanying opportunities", () => {
    const opportunity = {
      type: OpportunityType.ACCOMPANYING,
      title: "Arzttermin",
      info: "Deutsch",
      infoConfidential: "Termin beim Hausarzt",
      deal: null,
    };
    expect(isGermanOpportunity(opportunity as any)).toBe(false);
  });

  it("ignores a word that only contains the letters", () => {
    const opportunity = {
      type: OpportunityType.REGULAR,
      title: "Ungerman-like",
      deal: null,
    };
    expect(isGermanOpportunity(opportunity as any)).toBe(false);
  });
});

describe("matchScore", () => {
  it("counts the volunteer's slots on the appointment weekday for dated opportunities", () => {
    const opportunity = {
      type: OpportunityType.ACCOMPANYING,
      onetimer: { date: new Date("2026-11-09T10:00:00Z") },
      deal: { dealTimeslot: [] },
    };
    const mondayVolunteer = {
      deal: { dealTimeslot: [slot("FREQ=WEEKLY;BYDAY=MO")] },
    };
    const tuesdayVolunteer = {
      deal: { dealTimeslot: [slot("FREQ=WEEKLY;BYDAY=TU")] },
    };
    expect(matchScore(opportunity as any, mondayVolunteer as any)).toBe(1);
    expect(matchScore(opportunity as any, tuesdayVolunteer as any)).toBe(0);
  });
});
