import {
  AgentDetails,
  ApiAgentGet,
  ApiAgentGetList,
  ApiOpportunityAgent,
} from "need4deed-sdk";
import Comment from "../../data/entity/comment.entity";
import Agent from "../../data/entity/opportunity/agent.entity";
import { serializeAddress } from "./dto-address";
import { commentSerializer } from "./dto-comment";
import { dtoSerializePerson } from "./dto-person";

export function dtoAgentGetList(agent: Agent): ApiAgentGetList {
  return {
    id: agent.id,
    title: agent.title,
    type: agent.type!,
    trustLevel: agent.trustLevel,
    volunteerSearch: agent.searchStatus,
    activeVolunteers: agent.activeVolunteers,
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
  };
}

export function dtoOpportunityAgent(agent: Agent): ApiOpportunityAgent {
  return {
    type: agent.type,
    name: agent.title,
    address: serializeAddress(agent.representative?.person?.address),
    district: { id: agent.districtId, title: { de: agent.district?.title } },
  };
}

function dtoAgentDetails(agent: Agent): AgentDetails {
  return {
    about: agent.info,
    address: serializeAddress(agent.address),
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
