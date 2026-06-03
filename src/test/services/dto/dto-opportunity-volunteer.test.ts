import { OpportunityVolunteerStatusType } from "need4deed-sdk";
import { describe, expect, it, vi } from "vitest";
import OpportunityVolunteer from "../../../data/entity/m2m/opportunity-volunteer";
import {
  opportunityOpportunityVolunteerDTO,
  volunteerOpportunityVolunteerDTO,
} from "../../../services/dto/dto-opportunity-volunteer";

vi.mock("../../../services/dto/utils", () => ({
  getOptionItems: vi.fn(() => [{ id: 1, title: "Reading" }]),
  getLanguages: vi.fn(() => [
    { id: "en", title: "English", proficiency: "fluent" },
  ]),
  getAvailability: vi.fn(() => [{ id: 1, day: "MO", daytime: "08-11" }]),
}));

function makeOV(
  overrides: Partial<OpportunityVolunteer> = {},
): OpportunityVolunteer {
  return new OpportunityVolunteer({
    id: 1,
    status: OpportunityVolunteerStatusType.PENDING,
    volunteerId: 10,
    opportunityId: 20,
    updatedAt: new Date("2025-01-01"),
    opportunity: { title: "German Lessons" } as any,
    volunteer: {
      statusType: "regular",
      statusEngagement: "active",
      person: { name: "Jane Doe", avatarUrl: "https://cdn.example.com/a.png" },
      deal: {
        dealActivity: [],
        dealSkill: [],
        dealLanguage: [],
        time: { timeTimeslot: [] },
        location: { locationDistrict: [] },
      },
    } as any,
    ...overrides,
  });
}

describe("volunteerOpportunityVolunteerDTO", () => {
  it("returns the expected shape for a valid OpportunityVolunteer", () => {
    const ov = makeOV();
    const result = volunteerOpportunityVolunteerDTO(ov);

    expect(result.id).toBe(1);
    expect(result.status).toBe(OpportunityVolunteerStatusType.PENDING);
    expect(result.volunteerId).toBe(10);
    expect(result.opportunityId).toBe(20);
    expect(result.title).toBe("German Lessons");
    expect(result.updatedAt).toEqual(new Date("2025-01-01"));
  });

  it("throws when the input is not an OpportunityVolunteer instance", () => {
    const plain = { id: 1 } as any;
    expect(() => volunteerOpportunityVolunteerDTO(plain)).toThrow(
      "Wrong opportunity-volunteer format.",
    );
  });
});

describe("opportunityOpportunityVolunteerDTO", () => {
  it("returns the expected shape including volunteer details", () => {
    const ov = makeOV();
    const result = opportunityOpportunityVolunteerDTO(ov);

    expect(result.id).toBe(1);
    expect(result.volunteerId).toBe(10);
    expect(result.opportunityId).toBe(20);
    expect(result.name).toBe("Jane Doe");
    expect(result.avatarUrl).toBe("https://cdn.example.com/a.png");
    expect(result.volunteeringType).toBe("regular");
    expect(result.engagement).toBe("active");
    expect(result.activities).toBeDefined();
    expect(result.languages).toBeDefined();
    expect(result.availability).toBeDefined();
    expect(result.locations).toBeDefined();
  });

  it("throws when the input is not an OpportunityVolunteer instance", () => {
    expect(() => opportunityOpportunityVolunteerDTO({} as any)).toThrow(
      "Wrong opportunity-volunteer format.",
    );
  });
});
