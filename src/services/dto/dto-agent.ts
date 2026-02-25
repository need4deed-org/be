import { ApiAgentGetList, ApiOpportunityAgent } from "need4deed-sdk";
import Agent from "../../data/entity/opportunity/agent.entity";

export function dtoAgentGetList(
  agent: Agent & { activeVolunteers: number },
): ApiAgentGetList {
  return {
    id: agent.id,
    title: agent.title,
    type: agent.type,
    activeVolunteers: agent.activeVolunteers,
    address: {
      id: agent.addressId,
      street: agent.address?.street,
      city: agent.address?.city,
      postcode: {
        id: agent.address?.postcodeId,
        code: agent.address?.postcode?.value,
        latitude: undefined,
        longitude: undefined,
      },
    },
    district: { id: agent.districtId, title: { de: agent.district?.title } },
  };
}

export function dtoOpportunityAgent(agent: Agent): ApiOpportunityAgent {
  return {
    type: agent.type,
    name: agent.title,
    address: agent.representative.address
      ? `${agent.representative.address.street}, ${agent.representative.address.postcode?.value} ${agent.representative.address.city ? agent.representative.address.city : "Berlin"}`
      : "Berlin",
    district: { id: agent.districtId, title: { de: agent.district?.title } },
  };
}
