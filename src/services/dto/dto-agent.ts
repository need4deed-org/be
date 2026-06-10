import {
  AgentDetails,
  ApiAgentGet,
  ApiAgentGetList,
  ApiAgentMembership,
  ApiOpportunityAgent,
} from "need4deed-sdk";
import Comment from "../../data/entity/comment.entity";
import AgentPerson from "../../data/entity/m2m/agent-person";
import Agent from "../../data/entity/opportunity/agent.entity";
import { serializeAddress } from "./dto-address";
import { commentSerializer } from "./dto-comment";
import { dtoSerializePerson } from "./dto-person";

// Serializes an agent<->person membership for the moderation endpoints.
// Expects the `agent` and `person` relations to be loaded.
export function dtoSerializeAgentMembership(
  agentPerson: AgentPerson,
): ApiAgentMembership {
  return {
    id: agentPerson.id,
    agentId: agentPerson.agentId,
    agentTitle: agentPerson.agent?.title,
    person: dtoSerializePerson(agentPerson.person),
    role: agentPerson.role,
    status: agentPerson.status,
  };
}

export function dtoAgentGetList(agent: Agent): ApiAgentGetList {
  return {
    id: agent.id,
    title: agent.title,
    type: agent.type!,
    trustLevel: agent.trustLevel,
    volunteerSearch: agent.searchStatus,
    activeVolunteers: agent.activeVolunteers,
    numActiveVolunteers: agent.activeVolunteers,
    email:
      agent.representative?.person?.email || agent.organization?.email || "",
    district: { id: agent.districtId, title: { de: agent?.district?.title } },
  };
}

export function dtoAgentGet(
  agent: Agent & { comments: Comment[] },
): ApiAgentGet {
  return {
    ...dtoAgentGetList(agent),
    createdAt: agent.createdAt,
    updatedAt: agent.updatedAt,
    operator: agent?.organization?.title,
    representative: {
      ...dtoSerializePerson(agent?.representative?.person),
      role: agent?.representative?.role,
    },
    serviceType: agent.services,
    trustLevel: agent.trustLevel,
    statusEngagement: agent.engagementStatus,
    agentDetails: dtoAgentDetails(agent),
    comments: agent.comments?.map(commentSerializer),
    languages:
      agent.agentLanguage?.map((al) => ({
        id: al.languageId,
        title: al.language?.title ?? "",
      })) || [],
  };
}

export function dtoOpportunityAgent(agent: Agent): ApiOpportunityAgent {
  return {
    id: agent.id,
    type: agent.type,
    name: agent.title,
    address: serializeAddress(agent.representative?.person?.address),
    district: {
      id: agent.districtId,
      title: { de: agent.district?.title, en: agent.district?.title },
    },
  };
}

function dtoAgentDetails(agent: Agent): AgentDetails {
  let address = serializeAddress(agent.address);
  if (!agent.address && agent.agentPostcode?.length) {
    const plz = agent.agentPostcode[0].postcode?.value;
    if (plz) address = `${plz} Berlin`;
  }
  return {
    about: agent.info,
    address,
    website: agent.website,
    organizationType: agent.type,
    operator: agent?.organization?.title,
    services: agent.services?.join(", "),
    clientLanguages:
      agent.agentLanguage?.map((al) => ({
        id: al.languageId,
        title: al.language?.title,
      })) || [],
  };
}
