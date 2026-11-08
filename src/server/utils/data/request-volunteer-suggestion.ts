import { FastifyRequest } from "fastify";
import {
  AgentEngagementStatusType,
  AgentMembershipStatus,
  EntityTableName,
  UserRole,
} from "need4deed-sdk";
import { In, IsNull, Like } from "typeorm";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  UnauthorizedError,
} from "../../../config";
import Comment from "../../../data/entity/comment.entity";
import User from "../../../data/entity/user.entity";
import logger from "../../../logger";
import { getCallerAgentIds } from "./get-caller-agent-ids";
import { OPEN_OPPORTUNITY_STATUSES } from "./open-opportunity-statuses";
import { syncCommentTags } from "./sync-comment-tags";

export const SUGGESTION_REQUEST_MARKER = "📩";

async function findOwnerMembers(
  request: FastifyRequest,
  ownerAgentId: number,
): Promise<User[]> {
  const members = await request.server.db.agentPersonRepository.find({
    select: { id: true, personId: true },
    where: { agentId: ownerAgentId, status: AgentMembershipStatus.ACTIVE },
  });
  if (members.length === 0) {
    return [];
  }
  return request.server.db.userRepository.find({
    relations: { person: true },
    where: {
      personId: In(members.map(({ personId }) => personId)),
      role: UserRole.AGENT,
      isActive: true,
      deactivatedAt: IsNull(),
    },
  });
}

export async function requestVolunteerSuggestion(
  request: FastifyRequest,
  volunteerId: number,
  opportunityId: number,
): Promise<void> {
  const { authUser } = request;
  if (authUser?.role !== UserRole.AGENT) {
    throw new UnauthorizedError("Permission denied");
  }
  const { db } = request.server;
  const [callerAgentIds, opportunity] = await Promise.all([
    getCallerAgentIds(request, authUser.personId),
    db.opportunityRepository.findOne({
      relations: { agent: true },
      select: {
        id: true,
        title: true,
        status: true,
        agentId: true,
        agent: { id: true, title: true, engagementStatus: true },
      },
      where: { id: opportunityId },
    }),
  ]);
  if (!opportunity?.agentId || !callerAgentIds.includes(opportunity.agentId)) {
    throw new NotFoundError(`Opportunity (id:${opportunityId}) not found.`);
  }
  if (
    opportunity.agent?.engagementStatus === AgentEngagementStatusType.INACTIVE
  ) {
    throw new UnauthorizedError("This NGO is inactive.");
  }
  if (!OPEN_OPPORTUNITY_STATUSES.includes(opportunity.status)) {
    throw new BadRequestError("Opportunity is no longer open.");
  }

  const volunteer = await db.volunteerRepository.findOne({
    relations: { person: true, ownerAgent: true },
    select: {
      id: true,
      ownerAgentId: true,
      person: { id: true, firstName: true, middleName: true, lastName: true },
      ownerAgent: { id: true, title: true },
    },
    where: { id: volunteerId },
  });
  if (!volunteer) {
    throw new NotFoundError(`Volunteer (id:${volunteerId}) not found.`);
  }
  const { ownerAgentId, ownerAgent } = volunteer;
  if (!ownerAgentId || !ownerAgent) {
    throw new BadRequestError(
      "This volunteer isn't owned by an NGO: ask need4deed for a suggestion.",
    );
  }
  if (callerAgentIds.includes(ownerAgentId)) {
    throw new BadRequestError(
      "This volunteer is your NGO's own: suggest them directly.",
    );
  }

  const opportunityTag = `(opportunity #${opportunityId})`;
  const [existingMatch, existingRequest, recipients, requester] =
    await Promise.all([
      db.opportunityVolunteerRepository.existsBy({
        volunteerId,
        opportunityId,
      }),
      db.commentRepository.existsBy({
        entityType: EntityTableName.VOLUNTEER,
        entityId: volunteerId,
        text: Like(`${SUGGESTION_REQUEST_MARKER} %${opportunityTag}`),
      }),
      findOwnerMembers(request, ownerAgentId),
      authUser.personId
        ? db.personRepository.findOneBy({ id: authUser.personId })
        : null,
    ]);
  if (existingMatch) {
    throw new ConflictError(
      `The volunteer is already linked to opportunity (id:${opportunityId}).`,
    );
  }
  if (existingRequest) {
    throw new ConflictError(
      `A suggestion for opportunity (id:${opportunityId}) was already requested.`,
    );
  }
  if (recipients.length === 0) {
    throw new BadRequestError(
      "The volunteer's NGO has no active members: ask need4deed for a suggestion.",
    );
  }

  const requesterAgent = opportunity.agent?.title ?? "";
  const text = `${SUGGESTION_REQUEST_MARKER} ${requesterAgent} asks ${ownerAgent.title} to suggest this volunteer for "${opportunity.title}" ${opportunityTag}`;

  const { notify } = request.server;
  const comment = await db.commentRepository.manager.transaction(
    async (manager) => {
      const saved = await manager.getRepository(Comment).save(
        manager.getRepository(Comment).create({
          text,
          entityType: EntityTableName.VOLUNTEER,
          entityId: volunteerId,
          user: { id: authUser.id },
        }),
      );
      await syncCommentTags(
        saved.id,
        recipients.map(({ personId }) => personId as number),
        manager,
      );
      return saved;
    },
  );

  const requesterName = requester?.name || undefined;
  notify
    .tagged({
      kind: "comment",
      authorName: requesterName ?? requesterAgent,
      taggedNames: recipients
        .map(({ person }) => person?.name)
        .filter((name): name is string => Boolean(name)),
      text,
    })
    .catch((err) =>
      logger.error(`suggestion request ${comment.id}: slack failed: ${err}`),
    );

  const volunteerName = volunteer.person?.name ?? `#${volunteerId}`;
  void Promise.allSettled(
    recipients.map((user) =>
      notify.emailSuggestionRequest({
        recipient: {
          email: user.email,
          name: user.person?.name,
          language: user.language,
        },
        requesterName,
        requesterAgent,
        volunteerId,
        volunteerName,
        opportunityTitle: opportunity.title,
      }),
    ),
  ).then((results) => {
    const failed = results.filter((r) => r.status === "rejected").length;
    if (failed > 0) {
      logger.error(
        `suggestion request ${comment.id}: ${failed} of ${results.length} emails failed`,
      );
    }
  });
}
