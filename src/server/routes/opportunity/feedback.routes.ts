import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from "fastify";
import {
  ApiOpportunityFeedbackPatch,
  ApiOpportunityFeedbackPost,
  OpportunityVolunteerStatusType,
  UserRole,
} from "need4deed-sdk";
import { FindOptionsSelect } from "typeorm";
import { NotFoundError, UnauthorizedError } from "../../../config";
import OpportunityFeedback from "../../../data/entity/opportunity/opportunity-feedback.entity";
import { dtoOpportunityFeedback } from "../../../services/dto/dto-opportunity-feedback";
import {
  idParamSchema,
  opportunityFeedbackBodySchema,
  opportunityFeedbackParamSchema,
  opportunityFeedbackSchemaGet200,
  opportunityFeedbackSchemaWrite,
} from "../../schema";
import {
  assertRoleIn,
  isActiveAgentMember,
  isStaffRole,
  shouldMaskInactiveAgentData,
} from "../../utils";
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

const NGO_SIDE_ROLES: readonly UserRole[] = [
  UserRole.COORDINATOR,
  UserRole.ADMIN,
  UserRole.AGENT,
];

const FEEDBACK_PII_FIELDS = ["text"] as const;

const FEEDBACK_SELECT: FindOptionsSelect<OpportunityFeedback> = {
  id: true,
  opportunityId: true,
  authorUserId: true,
  text: true,
  createdAt: true,
  updatedAt: true,
  authorUser: {
    id: true,
    role: true,
    person: { id: true, firstName: true, middleName: true, lastName: true },
  },
};

type FeedbackAccess = {
  callerUserId: number;
  seesAll: boolean;
  isInactiveNgo: boolean;
};

async function assertFeedbackAccess(
  request: FastifyRequest,
  opportunityId: number,
): Promise<FeedbackAccess> {
  assertRoleIn(request, FEEDBACK_ROLES);
  const callerUserId = request.authUser?.id;
  if (!callerUserId) {
    throw new UnauthorizedError();
  }
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
    return { callerUserId, seesAll: true, isInactiveNgo: false };
  }
  if (
    role === UserRole.AGENT &&
    (await isActiveAgentMember(request, opportunity.agentId))
  ) {
    return {
      callerUserId,
      seesAll: true,
      isInactiveNgo:
        !!opportunity.agent &&
        shouldMaskInactiveAgentData(opportunity.agent, role),
    };
  }
  if (role === UserRole.VOLUNTEER) {
    const status = await getCallerMatchStatus(request, opportunityId);
    if (status && FEEDBACK_MATCH_STATUSES.includes(status)) {
      return { callerUserId, seesAll: false, isInactiveNgo: false };
    }
  }
  throw new UnauthorizedError(
    "Only matched volunteers, the opportunity's NGO and staff can access its feedback.",
  );
}

async function assertFeedbackWriteAccess(
  request: FastifyRequest,
  opportunityId: number,
): Promise<FeedbackAccess> {
  const access = await assertFeedbackAccess(request, opportunityId);
  if (access.isInactiveNgo) {
    throw new UnauthorizedError("This NGO is inactive.");
  }
  return access;
}

export default function opportunityFeedbackRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) {
  const loadWithAuthor = (id: number) =>
    fastify.db.opportunityFeedbackRepository.findOneOrFail({
      select: FEEDBACK_SELECT,
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
          ...(access.seesAll ? {} : { authorUserId: access.callerUserId }),
        },
        select: FEEDBACK_SELECT,
        relations: { authorUser: { person: true } },
        order: { createdAt: "ASC", id: "ASC" },
      });

      if (access.isInactiveNgo) {
        for (const entry of feedback) {
          if (NGO_SIDE_ROLES.includes(entry.authorUser.role)) {
            continue;
          }
          maskFields(
            entry as unknown as Record<string, unknown>,
            FEEDBACK_PII_FIELDS,
          );
          if (entry.authorUser.person) {
            maskFields(
              entry.authorUser.person as unknown as Record<string, unknown>,
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
        response: { 201: opportunityFeedbackSchemaWrite },
      },
    },
    async (request, reply) => {
      const opportunityId = request.params.id;
      const access = await assertFeedbackWriteAccess(request, opportunityId);

      const saved = await fastify.db.opportunityFeedbackRepository.save(
        new OpportunityFeedback({
          opportunityId,
          authorUserId: access.callerUserId,
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
        response: { 200: opportunityFeedbackSchemaWrite },
      },
    },
    async (request, reply) => {
      const { id: opportunityId, feedbackId } = request.params;
      const access = await assertFeedbackWriteAccess(request, opportunityId);

      const feedback = await fastify.db.opportunityFeedbackRepository.findOne({
        select: { id: true, authorUserId: true, text: true },
        where: { id: feedbackId, opportunityId },
      });
      if (!feedback) {
        throw new NotFoundError(`Feedback (id:${feedbackId}) not found.`);
      }
      if (feedback.authorUserId !== access.callerUserId) {
        throw new UnauthorizedError("Only the author can edit this feedback.");
      }

      const text = request.body.text.trim();
      if (text !== feedback.text) {
        await fastify.db.opportunityFeedbackRepository.update(
          { id: feedbackId },
          { text },
        );
      }

      return reply.send({
        message: `Feedback ${feedbackId} updated`,
        data: dtoOpportunityFeedback(await loadWithAuthor(feedbackId)),
      });
    },
  );
}
