import { AgentVolunteerSearchType } from "need4deed-sdk";
import { describe, expect, it } from "vitest";
import Agent from "../../../data/entity/opportunity/agent.entity";
import { dtoAgentGetList } from "../../../services";

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
      volunteerSearch: "searching",
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
