import {
  AgentEngagementStatusType,
  AgentServiceType,
  AgentTrustType,
  AgentType,
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
      type: "AE" as AgentType,
      trustLevel: "unknown" as AgentTrustType,
      statusSearch: "agent-not-needed" as AgentVolunteerSearchType,
      statusEngagement: "agent-new" as AgentEngagementStatusType,
      services: ["childcare", "refugee-accommodation"] as AgentServiceType[],
    };

    const result = parseAgentPatch(mockApiAgent);

    expect(result).toEqual({
      title: "Global Relief NGO",
      info: "A non-profit focused on disaster recovery.",
      website: "https://example.org",
      type: "AE",
      trustLevel: "unknown",
      searchStatus: "agent-not-needed",
      engagementStatus: "agent-new",
      services: ["childcare", "refugee-accommodation"],
    });
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
});
