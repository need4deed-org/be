import { AgentVolunteerSearchType } from "need4deed-sdk";
import { describe, expect, it, vi } from "vitest";
import Agent from "../../../data/entity/opportunity/agent.entity";
import {
  dtoAgentGet,
  dtoAgentGetList,
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
      services: ["Consulting", "Legal"],
      trustLevel: 5,
      engagementStatus: "Active",
      info: "Bio text",
      address: { street: "Baker St" },
      website: "https://agent.com",
      type: "NGO",
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

    // Checking nested agentDetails (via the internal helper)
    expect(result.agentDetails.services).toBe("Consulting, Legal");
    expect(result.agentDetails.clientLanguages[0].title).toBe("English");
  });

  it("should handle missing optional nested properties gracefully", () => {
    const minimalAgent = {
      services: [],
      comments: undefined,
    };

    const result = dtoAgentGet(minimalAgent as any);

    expect(result.operator).toBeUndefined();
    expect(result.comments).toBeUndefined();
    expect(result.representative.role).toBeUndefined();
  });
});

describe("dtoOpportunityAgent", () => {
  it("should map agent to opportunity format with localized district", () => {
    const mockAgent = {
      type: "Provider",
      title: "Clinic X",
      districtId: "dist_1",
      district: { title: "Mitte" },
      representative: { person: { address: { city: "Berlin" } } },
    };

    const result = dtoOpportunityAgent(mockAgent as any);

    expect(result).toEqual({
      type: "Provider",
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
  it("should join services into a comma-separated string", () => {
    const mockAgent = {
      services: ["A", "B", "C"],
      agentLanguage: [],
    };

    // Since it's a private helper, we test it through dtoAgentGet
    const result = dtoAgentGet(mockAgent as any);
    expect(result.agentDetails.services).toBe("A, B, C");
  });

  it("should return an empty array if agentLanguage is missing", () => {
    const mockAgent = { agentLanguage: null };
    const result = dtoAgentGet(mockAgent as any);
    expect(result.agentDetails.clientLanguages).toEqual([]);
  });
});

describe("dtoAgentGetList", () => {
  const mockAgentBase = {
    id: 1,
    title: "Helping Hands",
    type: "NGO",
    activeVolunteers: 10,
    addressId: 101,
    searchStatus: AgentVolunteerSearchType.SEARCHING,
    districtId: 201,
  };

  it("should correctly map a complete agent object", () => {
    const fullAgent = {
      ...mockAgentBase,
      address: {
        street: "Main St",
        city: "Berlin",
        postcodeId: 501,
        postcode: { value: "10115" },
      },
      district: {
        title: "Mitte",
      },
    } as Agent & { activeVolunteers: number };

    const result = dtoAgentGetList(fullAgent);

    expect(result).toEqual({
      id: 1,
      title: "Helping Hands",
      type: "NGO",
      activeVolunteers: 10,
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
