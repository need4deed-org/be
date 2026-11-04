import { OpportunityType, ProfileVolunteeringType } from "need4deed-sdk";
import { describe, expect, it } from "vitest";
import {
  isGermanOpportunity,
  matchScore,
  volunteerStatusTypesFor,
} from "../../../../server/utils/data/recommended-matches";

const slot = (rrule: string, from = 8, to = 11) => ({
  timeslot: {
    id: 1,
    rrule,
    start: new Date(2026, 0, 5, from),
    end: new Date(2026, 0, 5, to),
  },
});

describe("isGermanOpportunity", () => {
  it.each([
    ["title", { title: "Deutschkurs am Abend" }],
    ["description", { title: "Treffen", info: "We practise German together" }],
    ["compound", { title: "Treffen", info: "Deutschunterricht für Kinder" }],
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

  it.each([
    "Neu in Deutschland",
    "Refugees newly arrived in Germany",
    "Begleitung zum deutschen Jobcenter",
  ])("ignores the country in %s", (title) => {
    const opportunity = { type: OpportunityType.REGULAR, title, deal: null };
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
  it("scores the appointment district of an accompanying opportunity", () => {
    const opportunity = {
      type: OpportunityType.ACCOMPANYING,
      accompanying: {
        postcode: {
          value: "12043",
          districtPostcode: [{ id: 1, districtId: 7 }],
        },
      },
      deal: { dealTimeslot: [] },
    };
    const volunteerIn = (districtId: number) => ({
      deal: { dealDistrict: [{ districtId }], dealTimeslot: [] },
    });
    expect(matchScore(opportunity as any, volunteerIn(7) as any)).toBe(3);
    expect(matchScore(opportunity as any, volunteerIn(8) as any)).toBe(0);
  });

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
    const mondayNoonVolunteer = {
      deal: { dealTimeslot: [slot("FREQ=WEEKLY;BYDAY=MO", 11, 14)] },
    };
    expect(matchScore(opportunity as any, mondayVolunteer as any)).toBe(1);
    expect(matchScore(opportunity as any, mondayNoonVolunteer as any)).toBe(2);
    expect(matchScore(opportunity as any, tuesdayVolunteer as any)).toBe(0);
  });
});

describe("volunteerStatusTypesFor", () => {
  it.each([
    [
      OpportunityType.REGULAR,
      [
        ProfileVolunteeringType.REGULAR,
        ProfileVolunteeringType.REGULAR_ACCOMPANYING,
      ],
    ],
    [
      OpportunityType.ACCOMPANYING,
      [
        ProfileVolunteeringType.ACCOMPANYING,
        ProfileVolunteeringType.REGULAR_ACCOMPANYING,
      ],
    ],
    [OpportunityType.EVENTS, [ProfileVolunteeringType.EVENTS]],
  ])(
    "lists the volunteer types that fit a %s opportunity",
    (type, expected) => {
      expect(volunteerStatusTypesFor(type).sort()).toEqual(
        [...expected].sort(),
      );
    },
  );
});
