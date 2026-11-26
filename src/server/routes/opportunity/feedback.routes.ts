import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from "fastify";
import {
  AgentEngagementStatusType,
  ApiOpportunityFeedbackPatch,
  ApiOpportunityFeedbackPost,
  OpportunityVolunteerStatusType,
  UserRole,
} from "need4deed-sdk";
import { NotFoundError, UnauthorizedError } from "../../../config";
import OpportunityFeedback from "../../../data/entity/opportunity/opportunity-feedback.entity";
import { dtoOpportunityFeedback } from "../../../services/dto/dto-opportunity-feedback";
import {
  idParamSchema,
  opportunityFeedbackBodySchema,
  opportunityFeedbackParamSchema,
  opportunityFeedbackSchemaGet200,
  opportunityFeedbackSchemaWrite200,
} from "../../schema";
import { assertRoleIn, isActiveAgentMember, isStaffRole } from "../../utils";
import { getCallerMatchStatus } from "../../utils/data/get-caller-match-status";
import { maskFields, PERSON_PII_FIELDS } from "../../utils/pii/mask";

const FEEDBACK_ROLES: readonly UserRole[] = [
  UserRole.COORDINATOR,
  UserRole.ADMIN,
  UserRole.AGENT,
  UserRole.VOLUNTEER,
];

const FEEDBACK_MATCH_STATUSES: readonly OpportunityVolunteerStatusType[] = [
  OpportunityVolunteerStatusType.MATCHED,
  OpportunityVolunteerStatusType.ACTIVE,
  OpportunityVolunteerStatusType.PAST,
];

type FeedbackAccess = { seesAll: boolean; masksVolunteerNames: boolean };

async function assertFeedbackAccess(
  request: FastifyRequest,
  opportunityId: number,
): Promise<FeedbackAccess> {
  assertRoleIn(request, FEEDBACK_ROLES);
  const opportunity = await request.server.db.opportunityRepository.findOne({
    select: {
      id: true,
      agentId: true,
      agent: { id: true, engagementStatus: true },
    },
    relations: { agent: true },
    where: { id: opportunityId },
  });
  if (!opportunity) {
    throw new NotFoundError(`Opportunity (id:${opportunityId}) not found.`);
  }

  const role = request.authUser?.role;
  if (isStaffRole(role)) {
    return { seesAll: true, masksVolunteerNames: false };
  }
  if (
    role === UserRole.AGENT &&
    (await isActiveAgentMember(request, opportunity.agentId))
  ) {
    return {
      seesAll: true,
      masksVolunteerNames:
        opportunity.agent?.engagementStatus ===
        AgentEngagementStatusType.INACTIVE,
    };
  }
  if (role === UserRole.VOLUNTEER) {
    const status = await getCallerMatchStatus(request, opportunityId);
    if (status && FEEDBACK_MATCH_STATUSES.includes(status)) {
      return { seesAll: false, masksVolunteerNames: false };
    }
  }
  throw new UnauthorizedError(
    "Only matched volunteers, the opportunity's NGO and staff can access its feedback.",
  );
}

export default function opportunityFeedbackRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) {
  const loadWithAuthor = (id: number) =>
    fastify.db.opportunityFeedbackRepository.findOneOrFail({
      where: { id },
      relations: { authorUser: { person: true } },
    });

  fastify.get<{ Params: { id: number } }>(
    "/",
    {
      schema: {
        params: idParamSchema,
        response: { 200: opportunityFeedbackSchemaGet200 },
      },
    },
    async (request, reply) => {
      const opportunityId = request.params.id;
      const access = await assertFeedbackAccess(request, opportunityId);

      const feedback = await fastify.db.opportunityFeedbackRepository.find({
        where: {
          opportunityId,
          ...(access.seesAll ? {} : { authorUserId: request.authUser?.id }),
        },
        relations: { authorUser: { person: true } },
        order: { createdAt: "ASC", id: "ASC" },
      });

      if (access.masksVolunteerNames) {
        for (const { authorUser } of feedback) {
          if (authorUser.role === UserRole.VOLUNTEER && authorUser.person) {
            maskFields(
              authorUser.person as unknown as Record<string, unknown>,
              PERSON_PII_FIELDS,
            );
          }
        }
      }

      return reply.send({
        message: `Feedback for opportunity ${opportunityId}`,
        data: feedback.map(dtoOpportunityFeedback),
      });
    },
  );

  fastify.post<{ Params: { id: number }; Body: ApiOpportunityFeedbackPost }>(
    "/",
    {
      schema: {
        params: idParamSchema,
        body: opportunityFeedbackBodySchema,
        response: { 201: opportunityFeedbackSchemaWrite200 },
      },
    },
    async (request, reply) => {
      const opportunityId = request.params.id;
      await assertFeedbackAccess(request, opportunityId);

      const saved = await fastify.db.opportunityFeedbackRepository.save(
        new OpportunityFeedback({
          opportunityId,
          authorUserId: request.authUser?.id,
          text: request.body.text.trim(),
        }),
      );

      return reply.status(201).send({
        message: `Feedback added to opportunity ${opportunityId}`,
        data: dtoOpportunityFeedback(await loadWithAuthor(saved.id)),
      });
    },
  );

  fastify.patch<{
    Params: { id: number; feedbackId: number };
    Body: ApiOpportunityFeedbackPatch;
  }>(
    "/:feedbackId",
    {
      schema: {
        params: opportunityFeedbackParamSchema,
        body: opportunityFeedbackBodySchema,
        response: { 200: opportunityFeedbackSchemaWrite200 },
      },
    },
    async (request, reply) => {
      const { id: opportunityId, feedbackId } = request.params;
      await assertFeedbackAccess(request, opportunityId);

      const feedback = await fastify.db.opportunityFeedbackRepository.findOne({
        select: { id: true, authorUserId: true },
        where: { id: feedbackId, opportunityId },
      });
      if (!feedback) {
        throw new NotFoundError(`Feedback (id:${feedbackId}) not found.`);
      }
      if (feedback.authorUserId !== request.authUser?.id) {
        throw new UnauthorizedError("Only the author can edit this feedback.");
      }

      await fastify.db.opportunityFeedbackRepository.update(
        { id: feedbackId },
        { text: request.body.text.trim() },
      );

      return reply.send({
        message: `Feedback ${feedbackId} updated`,
        data: dtoOpportunityFeedback(await loadWithAuthor(feedbackId)),
      });
    },
  );
}
