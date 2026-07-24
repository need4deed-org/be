import {
  AgentEngagementStatusType,
  AgentTrustType,
  AgentVolunteerSearchType,
  ApiAgentPatch,
} from "need4deed-sdk";
import { describe, expect, it } from "vitest";
import { parseAgentPatch } from "../../../services/dto";

describe("parseAgentPatch", () => {
  it("should correctly map ApiAgentPatch fields to a Partial<Agent>", () => {
    const mockApiAgent: ApiAgentPatch = {
      title: "Global Relief NGO",
      about: "A non-profit focused on disaster recovery.",
      website: "https://example.org",
      typeId: 1,
      trustLevel: "unknown" as AgentTrustType,
      statusSearch: "agent-not-needed" as AgentVolunteerSearchType,
      statusEngagement: "agent-new" as AgentEngagementStatusType,
      // serviceIds is a m2m relation synced separately (updateAgentServices),
      // not part of the Partial<Agent> this returns — asserted below.
      serviceIds: [1, 2],
    };

    const result = parseAgentPatch(mockApiAgent);

    expect(result).toEqual({
      title: "Global Relief NGO",
      info: "A non-profit focused on disaster recovery.",
      website: "https://example.org",
      agentTypeId: 1,
      trustLevel: "unknown",
      searchStatus: "agent-not-needed",
      engagementStatus: "agent-new",
    });
    expect(result).not.toHaveProperty("serviceIds");
  });

  it("should handle undefined or missing optional fields", () => {
    const minimalAgent: Partial<ApiAgentPatch> = {
      title: "Minimal Agent",
    };

    const result = parseAgentPatch(minimalAgent as ApiAgentPatch);

    expect(result.title).toBe("Minimal Agent");
    expect(result.info).toBeUndefined();
    expect(result.searchStatus).toBeUndefined();
  });

  it("falls back to volunteerSearch when statusSearch is absent", () => {
    const agent: ApiAgentPatch = {
      volunteerSearch: "agent-searching" as AgentVolunteerSearchType,
    };

    const result = parseAgentPatch(agent);

    expect(result.searchStatus).toBe("agent-searching");
  });

  it("prefers statusSearch over volunteerSearch when both are set", () => {
    const agent: ApiAgentPatch = {
      statusSearch: "agent-not-needed" as AgentVolunteerSearchType,
      volunteerSearch: "agent-searching" as AgentVolunteerSearchType,
    };

    const result = parseAgentPatch(agent);

    expect(result.searchStatus).toBe("agent-not-needed");
  });

  it("maps districtId", () => {
    const agent: ApiAgentPatch = { districtId: 42 };

    expect(parseAgentPatch(agent).districtId).toBe(42);
  });
});
