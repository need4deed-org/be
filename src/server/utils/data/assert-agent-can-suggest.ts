import { FastifyRequest } from "fastify";
import {
  AgentEngagementStatusType,
  OpportunityVolunteerStatusType,
} from "need4deed-sdk";
import { In } from "typeorm";
import { NotFoundError, UnauthorizedError } from "../../../config";
import { getCallerAgentIds } from "./get-caller-agent-ids";
import { getLiveSharingAgentIds } from "./live-sharing-agents";

type Suggestion = {
  opportunityId: number;
  volunteerId: number;
  status?: OpportunityVolunteerStatusType;
};

export async function assertAgentCanSuggest(
  request: FastifyRequest,
  { opportunityId, volunteerId, status }: Suggestion,
): Promise<void> {
  if (status !== OpportunityVolunteerStatusType.PENDING) {
    throw new UnauthorizedError("Permission denied");
  }
  const { db } = request.server;
  const [callerAgentIds, volunteer, opportunity] = await Promise.all([
    getCallerAgentIds(request, request.authUser?.personId),
    db.volunteerRepository.findOne({
      select: { id: true, ownerAgentId: true },
      where: { id: volunteerId },
    }),
    db.opportunityRepository.findOne({
      select: { id: true, agentId: true },
      where: { id: opportunityId },
    }),
  ]);

  const ownerAgentId = volunteer?.ownerAgentId;
  if (!ownerAgentId || !callerAgentIds.includes(ownerAgentId)) {
    throw new NotFoundError(`Volunteer (id:${volunteerId}) not found.`);
  }
  const opportunityAgentId = opportunity?.agentId;
  if (!opportunityAgentId) {
    throw new NotFoundError(`Opportunity (id:${opportunityId}) not found.`);
  }

  if (!callerAgentIds.includes(opportunityAgentId)) {
    const sharing = await getLiveSharingAgentIds(request, [
      ownerAgentId,
      opportunityAgentId,
    ]);
    if (
      !sharing.includes(ownerAgentId) ||
      !sharing.includes(opportunityAgentId)
    ) {
      throw new NotFoundError(`Opportunity (id:${opportunityId}) not found.`);
    }
  }

  const inactive = await db.agentRepository.exists({
    where: {
      id: In([ownerAgentId, opportunityAgentId]),
      engagementStatus: AgentEngagementStatusType.INACTIVE,
    },
  });
  if (inactive) {
    throw new UnauthorizedError("This NGO is inactive.");
  }
}
