import { ApiAgentPatch } from "need4deed-sdk";
import Agent from "../../data/entity/opportunity/agent.entity";

// serviceIds isn't included here: it's a m2m relation (AgentService), synced
// separately via updateAgentServices — see agent.routes.ts's PATCH handler.
//
// districtId isn't mapped here either, deliberately: district must always be
// derived from the agent's postcode (see syncAgentDistrictFromPostcode in
// agent.routes.ts's PATCH handler), never set independently by a client — a
// client-supplied districtId would otherwise let district drift out of sync
// with the actual address (be#827).
export function parseAgentPatch(agent: ApiAgentPatch): Partial<Agent> {
  return {
    title: agent.title,
    info: agent.about,
    website: agent.website,
    agentTypeId: agent.typeId,
    organizationId: agent.organizationId,
    trustLevel: agent.trustLevel,
    // GET emits volunteerSearch while PATCH uses statusSearch; accept either
    // so round-tripped fields aren't silently dropped.
    searchStatus: agent.statusSearch ?? agent.volunteerSearch,
    engagementStatus: agent.statusEngagement,
  };
}
