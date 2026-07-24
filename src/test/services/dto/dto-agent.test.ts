import { AgentTrustType, AgentVolunteerSearchType } from "need4deed-sdk";
import { describe, expect, it, vi } from "vitest";
import Agent from "../../../data/entity/opportunity/agent.entity";
import {
  dtoAgentGet,
  dtoAgentGetList,
  dtoAgentOpportunity,
  dtoOpportunityAgent,
} from "../../../services";

// Mocking the external dependencies used in your functions
vi.mock("../../../services/dto/dto-person.ts", () => ({
  dtoSerializePerson: vi.fn((person) => ({ name: person?.firstName })),
}));
vi.mock("../../../services/dto/dto-address.ts", () => ({
  serializeAddress: vi.fn((addr) => (addr ? "serialized_address" : undefined)),
}));
vi.mock("../../../services/dto/dto-comment.ts", () => ({
  commentSerializer: vi.fn((c) => ({ id: c.id, content: c.content })),
}));

describe("dtoAgentGet", () => {
  // dtoAgentGetList hasn't been mocked cos it's being tested here in the same suite
  it("should correctly map a full agent object including comments and nested details", () => {
    const mockAgent = {
      id: 1,
      title: "Agent Alpha",
      createdAt: "2023-01-01",
      updatedAt: "2023-02-01",
      organization: { title: "Org Main" },
      representative: {
        person: { firstName: "John" },
        role: "Manager",
      },
      agentPerson: [
        {
          id: 501,
          agentId: 1,
          role: "Manager",
          status: "active",
          person: { firstName: "John" },
        },
        {
          id: 502,
          agentId: 1,
          role: "Social Worker",
          status: "pending",
          person: { firstName: "Jane" },
        },
      ],
      agentService: [
        { serviceId: 10, service: { title: "Consulting" } },
        { serviceId: 11, service: { title: "Legal" } },
      ],
      trustLevel: 5,
      engagementStatus: "Active",
      info: "Bio text",
      address: { street: "Baker St" },
      website: "https://agent.com",
      agentTypeId: 3,
      agentType: { title: "NGO" },
      agentLanguage: [{ languageId: "en", language: { title: "English" } }],
      comments: [{ id: 101, content: "Great service" }],
    };

    const result = dtoAgentGet(mockAgent as any);

    expect(result.operator).toBe("Org Main");
    expect(result.statusEngagement).toBe("Active");
    expect(result.comments).toHaveLength(1);
    expect(result.comments[0].content).toBe("Great service");

    // Checking nested representative mapping
    expect(result.representative).toEqual({
      name: "John",
      role: "Manager",
    });

    // contacts should list every AgentPerson membership, not just the
    // collapsed representative
    expect(result.contacts).toEqual([
      {
        id: 501,
        agentId: 1,
        agentTitle: "Agent Alpha",
        person: { name: "John" },
        role: "Manager",
        status: "active",
      },
      {
        id: 502,
        agentId: 1,
        agentTitle: "Agent Alpha",
        person: { name: "Jane" },
        role: "Social Worker",
        status: "pending",
      },
    ]);

    // Checking nested agentDetails (via the internal helper)
    expect(result.agentDetails.organizationType).toEqual({
      id: 3,
      title: { de: "NGO" },
    });
    expect(result.agentDetails.services).toEqual([
      { id: 10, title: { de: "Consulting" } },
      { id: 11, title: { de: "Legal" } },
    ]);
    expect(result.agentDetails.clientLanguages[0].title).toBe("English");

    // Checking the top-level (non-nested) type/services mirror the same data
    expect(result.type).toEqual({ id: 3, title: { de: "NGO" } });
    expect(result.services).toEqual([
      { id: 10, title: { de: "Consulting" } },
      { id: 11, title: { de: "Legal" } },
    ]);
  });

  it("should handle missing optional nested properties gracefully", () => {
    const minimalAgent = {
      comments: undefined,
    };

    const result = dtoAgentGet(minimalAgent as any);

    expect(result.operator).toBeUndefined();
    expect(result.comments).toBeUndefined();
    expect(result.representative.role).toBeUndefined();
    expect(result.contacts).toEqual([]);
  });
});

describe("dtoOpportunityAgent", () => {
  it("should map agent to opportunity format with localized district", () => {
    const mockAgent = {
      id: 7,
      agentTypeId: 9,
      agentType: { title: "Provider" },
      title: "Clinic X",
      districtId: "dist_1",
      district: { title: "Mitte" },
      representative: { person: { address: { city: "Berlin" } } },
    };

    const result = dtoOpportunityAgent(mockAgent as any);

    expect(result).toEqual({
      id: 7,
      type: { id: 9, title: { de: "Provider" } },
      name: "Clinic X",
      address: "serialized_address",
      district: {
        id: "dist_1",
        title: { de: "Mitte", en: "Mitte" },
      },
    });
  });
});

describe("dtoAgentDetails (Internal Logic)", () => {
  it("should map services to an array of translated options", () => {
    const mockAgent = {
      agentService: [
        { serviceId: 1, service: { title: "A" } },
        { serviceId: 2, service: { title: "B" } },
        { serviceId: 3, service: { title: "C" } },
      ],
      agentLanguage: [],
    };

    // Since it's a private helper, we test it through dtoAgentGet
    const result = dtoAgentGet(mockAgent as any);
    expect(result.agentDetails.services).toEqual([
      { id: 1, title: { de: "A" } },
      { id: 2, title: { de: "B" } },
      { id: 3, title: { de: "C" } },
    ]);
  });

  it("should return an empty array if agentLanguage is missing", () => {
    const mockAgent = { agentLanguage: null };
    const result = dtoAgentGet(mockAgent as any);
    expect(result.agentDetails.clientLanguages).toEqual([]);
  });

  it("should expose addressStreet and addressPostcode from the address relation", () => {
    const mockAgent = {
      agentLanguage: [],
      address: { street: "Musterstraße 1", postcode: { value: "10115" } },
    };
    const result = dtoAgentGet(mockAgent as any);
    expect(result.agentDetails.addressStreet).toBe("Musterstraße 1");
    expect(result.agentDetails.addressPostcode).toBe("10115");
  });

  it("should return null for addressStreet and addressPostcode when address is absent", () => {
    const mockAgent = { agentLanguage: [] };
    const result = dtoAgentGet(mockAgent as any);
    expect(result.agentDetails.addressStreet).toBeNull();
    expect(result.agentDetails.addressPostcode).toBeNull();
  });
});

describe("dtoAgentGetList", () => {
  const mockAgentBase = {
    id: 1,
    title: "Helping Hands",
    agentTypeId: 3,
    agentType: { title: "NGO" },
    activeVolunteers: 10,
    numOpportunities: 0,
    addressId: 101,
    searchStatus: AgentVolunteerSearchType.SEARCHING,
    districtId: 201,
  };

  it("maps all scalar fields from a fully-loaded agent", () => {
    const fullAgent = {
      ...mockAgentBase,
      trustLevel: AgentTrustType.HIGH,
      address: {
        street: "Main St",
        city: "Berlin",
        postcodeId: 501,
        postcode: { value: "10115" },
      },
      district: { title: "Mitte" },
      representative: { person: { email: "contact@helping-hands.org" } },
      opportunity: [{} as any, {} as any],
    } as Agent & { activeVolunteers: number; numOpportunities: number };

    const result = dtoAgentGetList(fullAgent);

    expect(result).toEqual({
      id: 1,
      title: "Helping Hands",
      type: { id: 3, title: { de: "NGO" } },
      trustLevel: AgentTrustType.HIGH,
      activeVolunteers: 10,
      numOpportunities: 2,
      email: "contact@helping-hands.org",
      district: {
        id: 201,
        title: { de: "Mitte" },
      },
      volunteerSearch: "agent-searching",
    });
  });

  it("should handle a null district gracefully", () => {
    const agentWithNullDistrict = {
      ...mockAgentBase,
      district: null, // Test null specifically as it's common from DBs
    } as any;

    const result = dtoAgentGetList(agentWithNullDistrict);

    expect(result.district).toEqual({
      id: 201,
      title: { de: undefined },
    });
  });

  it("should map the volunteerSearch enum correctly", () => {
    // Ensure the mapping from agent.searchStatus to volunteerSearch is correct
    const result = dtoAgentGetList({ ...mockAgentBase } as any);
    expect(result.volunteerSearch).toBe(AgentVolunteerSearchType.SEARCHING);
  });
});

describe("dtoAgentOpportunity", () => {
  const baseOpportunity = {
    id: 42,
    title: "German tutoring",
    type: "regular",
    status: "opp-active",
    statusMatch: "opp-vol-matched",
    numberVolunteers: 3,
    createdAt: new Date("2026-01-15"),
    districtId: 7,
    district: { id: 7 },
    deal: {
      dealLanguage: [],
      dealActivity: [],
      dealDistrict: [],
      dealTimeslot: [],
    },
  };

  it("maps the opportunity scalars and its linked volunteers", () => {
    const opportunity = {
      ...baseOpportunity,
      opportunityVolunteer: [
        {
          id: 5,
          volunteerId: 9,
          status: "opp-matched",
          volunteer: { person: { name: "Jane Doe", avatarUrl: "a.png" } },
        },
      ],
    };

    expect(dtoAgentOpportunity(opportunity as any)).toEqual({
      id: 42,
      title: "German tutoring",
      volunteerType: "regular",
      statusOpportunity: "opp-active",
      statusMatch: "opp-vol-matched",
      numberOfVolunteers: 3,
      createdAt: new Date("2026-01-15"),
      district: { id: 7 },
      languages: [],
      activities: [],
      location: [],
      availability: [],
      volunteers: [
        {
          id: 5,
          volunteerId: 9,
          status: "opp-matched",
          name: "Jane Doe",
          avatarUrl: "a.png",
        },
      ],
    });
  });

  it("passes through masked person fields verbatim", () => {
    // The route masks person PII upstream; the DTO must not un-mask or drop it.
    const opportunity = {
      ...baseOpportunity,
      opportunityVolunteer: [
        {
          id: 5,
          volunteerId: 9,
          status: "opp-matched",
          volunteer: { person: { name: "x*** y***", avatarUrl: "z***" } },
        },
      ],
    };

    const { volunteers } = dtoAgentOpportunity(opportunity as any);
    expect(volunteers[0].name).toBe("x*** y***");
    expect(volunteers[0].avatarUrl).toBe("z***");
  });

  it("yields an empty volunteers array when none are linked", () => {
    const result = dtoAgentOpportunity({
      ...baseOpportunity,
      opportunityVolunteer: undefined,
    } as any);
    expect(result.volunteers).toEqual([]);
  });

  it("tolerates a linked volunteer with no person loaded", () => {
    const result = dtoAgentOpportunity({
      ...baseOpportunity,
      opportunityVolunteer: [{ id: 5, volunteerId: 9, status: "opp-pending" }],
    } as any);
    expect(result.volunteers[0]).toEqual({
      id: 5,
      volunteerId: 9,
      status: "opp-pending",
      name: undefined,
      avatarUrl: undefined,
    });
  });
});
