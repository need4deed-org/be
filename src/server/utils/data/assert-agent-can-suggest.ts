import { FastifyRequest } from "fastify";
import {
  AgentEngagementStatusType,
  ApiOpportunityVolunteerPost,
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
import { OPEN_OPPORTUNITY_STATUSES } from "./open-opportunity-statuses";

type Suggestion = Pick<
  ApiOpportunityVolunteerPost,
  "opportunityId" | "volunteerId" | "status" | "emailNote"
>;
type OwnedVolunteer = { callerAgentIds: number[]; ownerAgentId: number };

const isInactive = (
  agent: Pick<Agent, "engagementStatus"> | null | undefined,
) => agent?.engagementStatus === AgentEngagementStatusType.INACTIVE;

async function findOwnedVolunteer(
  request: FastifyRequest,
  volunteerId: number,
): Promise<OwnedVolunteer | null> {
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
  if (isInactive(volunteer.ownerAgent)) {
    throw new UnauthorizedError("This NGO is inactive.");
  }
  return { callerAgentIds, ownerAgentId };
}

function findOpportunity(request: FastifyRequest, opportunityId: number) {
  return request.server.db.opportunityRepository.findOne({
    relations: { agent: true },
    select: {
      id: true,
      agentId: true,
      status: true,
      agent: { id: true, engagementStatus: true },
    },
    where: { id: opportunityId },
  });
}

async function reachesOpportunity(
  request: FastifyRequest,
  { callerAgentIds, ownerAgentId }: OwnedVolunteer,
  opportunity: Awaited<ReturnType<typeof findOpportunity>>,
): Promise<boolean> {
  const opportunityAgentId = opportunity?.agentId;
  if (!opportunityAgentId) {
    return false;
  }
  if (callerAgentIds.includes(opportunityAgentId)) {
    if (isInactive(opportunity.agent)) {
      throw new UnauthorizedError("This NGO is inactive.");
    }
    return true;
  }
  const sharing = await getLiveSharingAgentIds(request, [
    ownerAgentId,
    opportunityAgentId,
  ]);
  return sharing.includes(ownerAgentId) && sharing.includes(opportunityAgentId);
}

export async function assertAgentCanSuggest(
  request: FastifyRequest,
  { opportunityId, volunteerId, status, emailNote }: Suggestion,
): Promise<void> {
  const [owned, opportunity] = await Promise.all([
    findOwnedVolunteer(request, volunteerId),
    findOpportunity(request, opportunityId),
  ]);
  if (!owned) {
    throw new NotFoundError(`Volunteer (id:${volunteerId}) not found.`);
  }
  if (
    !opportunity ||
    !(await reachesOpportunity(request, owned, opportunity))
  ) {
    throw new NotFoundError(`Opportunity (id:${opportunityId}) not found.`);
  }
  if (status !== OpportunityVolunteerStatusType.PENDING) {
    throw new UnauthorizedError("Permission denied");
  }
  if (emailNote?.trim()) {
    throw new BadRequestError("emailNote is only available to coordinators.");
  }
  if (!OPEN_OPPORTUNITY_STATUSES.includes(opportunity.status)) {
    throw new BadRequestError("Opportunity is no longer open.");
  }
}

export async function isOwnersPendingSuggestion(
  request: FastifyRequest,
  {
    volunteerId,
    opportunityId,
    status,
  }: Pick<Suggestion, "volunteerId" | "opportunityId" | "status">,
): Promise<boolean> {
  if (status !== OpportunityVolunteerStatusType.PENDING) {
    return false;
  }
  const [owned, opportunity] = await Promise.all([
    findOwnedVolunteer(request, volunteerId),
    findOpportunity(request, opportunityId),
  ]);
  return !!owned && reachesOpportunity(request, owned, opportunity);
}
