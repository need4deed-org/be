import { FastifyRequest } from "fastify";
import {
  AgentEngagementStatusType,
  ApiOpportunityVolunteerPost,
  OpportunityStatusType,
  OpportunityVolunteerStatusType,
} from "need4deed-sdk";
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
} from "../../../config";
import Agent from "../../../data/entity/opportunity/agent.entity";
import { getCallerAgentIds } from "./get-caller-agent-ids";
import { getLiveSharingAgentIds } from "./live-sharing-agents";

type Suggestion = Pick<
  ApiOpportunityVolunteerPost,
  "opportunityId" | "volunteerId" | "status"
>;

const SUGGESTABLE_OPPORTUNITY_STATUSES = [
  OpportunityStatusType.NEW,
  OpportunityStatusType.SEARCHING,
  OpportunityStatusType.ACTIVE,
];

const isInactive = (
  agent: Pick<Agent, "engagementStatus"> | null | undefined,
) => agent?.engagementStatus === AgentEngagementStatusType.INACTIVE;

async function findOwnedVolunteer(
  request: FastifyRequest,
  volunteerId: number,
) {
  const [callerAgentIds, volunteer] = await Promise.all([
    getCallerAgentIds(request, request.authUser?.personId),
    request.server.db.volunteerRepository.findOne({
      relations: { ownerAgent: true },
      select: {
        id: true,
        ownerAgentId: true,
        ownerAgent: { id: true, engagementStatus: true },
      },
      where: { id: volunteerId },
    }),
  ]);
  const ownerAgentId = volunteer?.ownerAgentId;
  if (!ownerAgentId || !callerAgentIds.includes(ownerAgentId)) {
    return null;
  }
  return { callerAgentIds, ownerAgentId, ownerAgent: volunteer.ownerAgent };
}

export async function assertAgentCanSuggest(
  request: FastifyRequest,
  { opportunityId, volunteerId, status }: Suggestion,
): Promise<void> {
  const [owned, opportunity] = await Promise.all([
    findOwnedVolunteer(request, volunteerId),
    request.server.db.opportunityRepository.findOne({
      relations: { agent: true },
      select: {
        id: true,
        agentId: true,
        status: true,
        agent: { id: true, engagementStatus: true },
      },
      where: { id: opportunityId },
    }),
  ]);
  if (!owned) {
    throw new NotFoundError(`Volunteer (id:${volunteerId}) not found.`);
  }
  const opportunityAgentId = opportunity?.agentId;
  if (!opportunityAgentId) {
    throw new NotFoundError(`Opportunity (id:${opportunityId}) not found.`);
  }

  if (owned.callerAgentIds.includes(opportunityAgentId)) {
    if (isInactive(owned.ownerAgent) || isInactive(opportunity.agent)) {
      throw new UnauthorizedError("This NGO is inactive.");
    }
  } else {
    const sharing = await getLiveSharingAgentIds(request, [
      owned.ownerAgentId,
      opportunityAgentId,
    ]);
    if (
      !sharing.includes(owned.ownerAgentId) ||
      !sharing.includes(opportunityAgentId)
    ) {
      throw new NotFoundError(`Opportunity (id:${opportunityId}) not found.`);
    }
  }

  if (status !== OpportunityVolunteerStatusType.PENDING) {
    throw new UnauthorizedError("Permission denied");
  }
  if (!SUGGESTABLE_OPPORTUNITY_STATUSES.includes(opportunity.status)) {
    throw new BadRequestError("Opportunity is no longer open.");
  }
}

export async function isOwnersPendingSuggestion(
  request: FastifyRequest,
  { volunteerId, status }: Pick<Suggestion, "volunteerId" | "status">,
): Promise<boolean> {
  if (status !== OpportunityVolunteerStatusType.PENDING) {
    return false;
  }
  const owned = await findOwnedVolunteer(request, volunteerId);
  if (!owned) {
    return false;
  }
  if (isInactive(owned.ownerAgent)) {
    throw new UnauthorizedError("This NGO is inactive.");
  }
  return true;
}
