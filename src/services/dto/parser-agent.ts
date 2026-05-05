import { ApiAgentPatch } from "need4deed-sdk";
import Agent from "../../data/entity/opportunity/agent.entity";

// districtId will be added to ApiAgentPatch in SDK issue #93
type ApiAgentPatchExtended = ApiAgentPatch & { districtId?: number };

export function parseAgentPatch(agent: ApiAgentPatchExtended): Partial<Agent> {
  return {
    title: agent.title,
    info: agent.about,
    website: agent.website,
    type: agent.type,
    trustLevel: agent.trustLevel,
    searchStatus: agent.statusSearch,
    engagementStatus: agent.statusEngagement,
    services: agent.services,
    districtId: agent.districtId,
  };
}
