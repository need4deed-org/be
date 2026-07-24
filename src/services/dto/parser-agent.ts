import { ApiAgentPatch } from "need4deed-sdk";
import Agent from "../../data/entity/opportunity/agent.entity";

// serviceIds isn't included here: it's a m2m relation (AgentService), synced
// separately via updateAgentServices — see agent.routes.ts's PATCH handler.
export function parseAgentPatch(agent: ApiAgentPatch): Partial<Agent> {
  return {
    title: agent.title,
    info: agent.about,
    website: agent.website,
    agentTypeId: agent.typeId,
    trustLevel: agent.trustLevel,
    // GET emits volunteerSearch while PATCH uses statusSearch; accept either
    // so round-tripped fields aren't silently dropped.
    searchStatus: agent.statusSearch ?? agent.volunteerSearch,
    engagementStatus: agent.statusEngagement,
    districtId: agent.districtId,
  };
}
