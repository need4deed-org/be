import { ApiAgentGetList, ApiOpportunityAgent } from "need4deed-sdk";
import Agent from "../../data/entity/opportunity/agent.entity";
import { serializeAddress } from "./dto-address";

export function dtoAgentGetList(
  agent: Agent & { activeVolunteers: number },
): ApiAgentGetList {
  return {
    id: agent.id,
    title: agent.title,
    type: agent.type,
    volunteerSearch: agent.searchStatus,
    activeVolunteers: agent.activeVolunteers,
    district: { id: agent.districtId, title: { de: agent.district?.title } },
  };
}

export function dtoOpportunityAgent(agent: Agent): ApiOpportunityAgent {
  return {
    type: agent.type,
    name: agent.title,
    address: serializeAddress(agent.representative?.address),
    district: { id: agent.districtId, title: { de: agent.district?.title } },
  };
}
