import {
  AgentDetails,
  ApiAgentGet,
  ApiAgentGetList,
  ApiAgentMembership,
  ApiAgentOpportunity,
  ApiOpportunityAgent,
} from "need4deed-sdk";
import Comment from "../../data/entity/comment.entity";
import AgentPerson from "../../data/entity/m2m/agent-person";
import Agent from "../../data/entity/opportunity/agent.entity";
import Opportunity from "../../data/entity/opportunity/opportunity.entity";
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

type AgentDetailsExtended = AgentDetails & { addressStreet?: string | null; addressPostcode?: string | null };
type ApiAgentGetExtended = Omit<ApiAgentGet, "agentDetails"> & { agentDetails: AgentDetailsExtended };

export function dtoAgentGet(
  agent: Agent & { comments: Comment[] },
): ApiAgentGetExtended {
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

function dtoAgentDetails(agent: Agent): AgentDetails & { addressStreet?: string | null; addressPostcode?: string | null } {
  return {
    about: agent.info,
    address: serializeAddress(agent.address),
    addressStreet: agent.address?.street ?? null,
    addressPostcode: agent.address?.postcode?.value ?? null,
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

/**
 * One of an agent's opportunities plus the volunteers linked to it. Response
 * item of GET /agent/:id/opportunity-linked. Expects the
 * `opportunityVolunteer.volunteer.person` relation loaded; person PII is masked
 * upstream by the route's preSerialization hook, so masked values pass through.
 */
export function dtoAgentOpportunity(
  opportunity: Opportunity,
): ApiAgentOpportunity {
  return {
    id: opportunity.id,
    title: opportunity.title,
    statusOpportunity: opportunity.status,
    statusMatch: opportunity.statusMatch,
    numberOfVolunteers: opportunity.numberVolunteers,
    createdAt: opportunity.createdAt,
    volunteers: (opportunity.opportunityVolunteer ?? [])
      .filter(Boolean)
      .map((ov) => ({
        id: ov.id,
        volunteerId: ov.volunteerId,
        status: ov.status,
        name: ov.volunteer?.person?.name,
        avatarUrl: ov.volunteer?.person?.avatarUrl,
      })),
  };
}
