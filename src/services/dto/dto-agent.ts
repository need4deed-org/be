import {
  AgentDetails,
  ApiAgentGet,
  ApiAgentGetList,
  ApiAgentMembership,
  ApiAgentOpportunity,
  ApiOpportunityAgent,
  OptionById,
  OptionTitle,
} from "need4deed-sdk";
import Comment from "../../data/entity/comment.entity";
import AgentPerson from "../../data/entity/m2m/agent-person";
import Agent from "../../data/entity/opportunity/agent.entity";
import Opportunity from "../../data/entity/opportunity/opportunity.entity";
import { Centroid } from "../../data/utils/get-district";
import { serializeAddress } from "./dto-address";
import { commentSerializer } from "./dto-comment";
import { dtoSerializePerson } from "./dto-person";
import { getAvailability, getCoordinates, getLanguages } from "./utils";

function dtoOptionTitle(
  id: number | undefined,
  ref?: { title?: string; translations?: OptionTitle },
): OptionById {
  return { id, title: ref?.translations ?? { de: ref?.title } };
}

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

export function getAgentDistrictIdNeedingCentroid(
  agent: Agent,
): number | undefined {
  const { latitude, longitude } = getCoordinates(agent.address?.postcode);
  if (latitude !== null && longitude !== null) {
    return undefined;
  }
  return agent.district?.id ?? agent.districtId ?? undefined;
}

function getAgentCoordinates(
  agent: Agent,
  districtCentroid?: Centroid,
): { lat: number | null; lon: number | null } {
  const { latitude, longitude } = getCoordinates(agent.address?.postcode);
  if (latitude !== null && longitude !== null) {
    return { lat: latitude, lon: longitude };
  }
  return {
    lat: districtCentroid?.latitude ?? null,
    lon: districtCentroid?.longitude ?? null,
  };
}

export function dtoAgentGetList(
  agent: Agent,
  districtCentroid?: Centroid,
): ApiAgentGetList {
  return {
    id: agent.id,
    title: agent.title,
    type: dtoOptionTitle(agent.agentTypeId, agent.agentType),
    trustLevel: agent.trustLevel,
    volunteerSearch: agent.searchStatus,
    activeVolunteers: agent.activeVolunteers,
    numOpportunities: agent.opportunity?.length ?? 0,
    email:
      agent.representative?.person?.email || agent.organization?.email || "",
    district: { id: agent.districtId, title: { de: agent?.district?.title } },
    unclaimed: agent.unclaimed,
    ...getAgentCoordinates(agent, districtCentroid),
  };
}

type AgentDetailsExtended = AgentDetails & {
  addressStreet?: string | null;
  addressPostcode?: string | null;
};
type ApiAgentGetExtended = Omit<ApiAgentGet, "agentDetails"> & {
  agentDetails: AgentDetailsExtended;
};

export function dtoAgentGet(
  agent: Agent & { comments: Comment[] },
  districtCentroid?: Centroid,
): ApiAgentGetExtended {
  return {
    ...dtoAgentGetList(agent, districtCentroid),
    createdAt: agent.createdAt,
    updatedAt: agent.updatedAt,
    operator: agent?.organization?.title,
    representative: {
      ...dtoSerializePerson(agent?.representative?.person),
      role: agent?.representative?.role,
    },
    contacts: (agent.agentPerson ?? []).map((ap) =>
      dtoSerializeAgentMembership({ ...ap, agent }),
    ),
    services: (agent.agentService ?? []).map((as) =>
      dtoOptionTitle(as.serviceId, as.service),
    ),
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
    type: dtoOptionTitle(agent.agentTypeId, agent.agentType),
    name: agent.title,
    address: serializeAddress(agent.address),
    district: {
      id: agent.districtId,
      title: { de: agent.district?.title, en: agent.district?.title },
    },
  };
}

function dtoAgentDetails(agent: Agent): AgentDetails & {
  addressStreet?: string | null;
  addressPostcode?: string | null;
} {
  return {
    about: agent.info,
    address: serializeAddress(agent.address),
    addressStreet: agent.address?.street ?? null,
    addressPostcode: agent.address?.postcode?.value ?? null,
    website: agent.website,
    organizationType: dtoOptionTitle(agent.agentTypeId, agent.agentType),
    operator: agent?.organization?.title,
    services: (agent.agentService ?? []).map((as) =>
      dtoOptionTitle(as.serviceId, as.service),
    ),
    clientLanguages:
      agent.agentLanguage?.map((al) => ({
        id: al.languageId,
        title: al.language?.title,
      })) || [],
  };
}

export function dtoAgentOpportunity(
  opportunity: Opportunity,
): ApiAgentOpportunity {
  return {
    id: opportunity.id,
    title: opportunity.title,
    volunteerType: opportunity.type,
    statusOpportunity: opportunity.status,
    statusMatch: opportunity.statusMatch,
    numberOfVolunteers: opportunity.numberVolunteers,
    createdAt: opportunity.createdAt,
    district: { id: opportunity.district?.id ?? opportunity.districtId },
    languages: getLanguages(opportunity.deal?.dealLanguage ?? []),
    activities: (opportunity.deal?.dealActivity ?? [])
      .filter(Boolean)
      .map((da) => ({ id: da.activity.id })),
    location: (opportunity.deal?.dealDistrict ?? [])
      .filter(Boolean)
      .map((dd) => ({ id: dd.district.id })),
    availability: getAvailability(opportunity.deal?.dealTimeslot ?? []) ?? [],
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
