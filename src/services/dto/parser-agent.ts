import { ApiAgentPatch } from "need4deed-sdk";
import Agent from "../../data/entity/opportunity/agent.entity";

export function parseAgentPatch(agent: ApiAgentPatch): Partial<Agent> {
  return {
    title: agent.title,
    info: agent.about,
    website: agent.website,
    type: agent.type,
    trustLevel: agent.trustLevel,
    // GET emits volunteerSearch/serviceType while PATCH uses statusSearch/services;
    // accept either so round-tripped fields aren't silently dropped.
    searchStatus: agent.statusSearch ?? agent.volunteerSearch,
    engagementStatus: agent.statusEngagement,
    services: agent.services ?? agent.serviceType,
    districtId: agent.districtId,
  };
}
