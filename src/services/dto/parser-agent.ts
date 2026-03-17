import { ApiAgentPatch } from "need4deed-sdk";
import Agent from "../../data/entity/opportunity/agent.entity";

export function parseAgentPatch(agent: ApiAgentPatch): Partial<Agent> {
  return {
    title: agent.title,
    info: agent.about,
    website: agent.website,
    type: agent.type,
    trustLevel: agent.trustLevel,
    searchStatus: agent.statusSearch,
    engagementStatus: agent.statusEngagement,
    services: agent.services,
  };
}
