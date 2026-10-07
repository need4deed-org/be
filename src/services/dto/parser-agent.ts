import { ApiAgentPatch } from "need4deed-sdk";
import Agent from "../../data/entity/opportunity/agent.entity";

export function parseAgentPatch(agent: ApiAgentPatch): Partial<Agent> {
  return {
    title: agent.title,
    info: agent.about,
    website: agent.website,
    agentTypeId: agent.typeId,
    organizationId: agent.organizationId,
    trustLevel: agent.trustLevel,
    searchStatus: agent.statusSearch ?? agent.volunteerSearch,
    engagementStatus: agent.statusEngagement,
  };
}
