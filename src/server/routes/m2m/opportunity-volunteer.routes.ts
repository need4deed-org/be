import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from "fastify";
import {
  AgentEngagementStatusType,
  CommunicationType,
  Lang,
  OpportunityVolunteerStatusType,
  ProfileVolunteeringType,
  UserRole,
} from "need4deed-sdk";
import {
  ConflictError,
  NotFoundError,
  UnauthorizedError,
} from "../../../config";
import OpportunityVolunteer from "../../../data/entity/m2m/opportunity-volunteer";
import {
  updateOpportunityMatching,
  updateVolunteerMatching,
} from "../../../data/utils";
import logger from "../../../logger";
import { idParamSchema, responseSchema } from "../../schema";
import { ParamsId, ReplyMessage } from "../../types";
import { assertAgentOwnsOpportunity } from "../../utils/data/assert-agent-owns-opportunity";
import { addTranslatedFields } from "../../utils/data/for-routes";
import { logEmailCommunication } from "../../utils/data/log-email-communication";
import { deleteMatch } from "../../utils/data/sync-volunteer-engagement";

async function triggerEmailSuggestion(
  fastify: FastifyInstance,
  id: number,
): Promise<void> {
  const opportunityVolunteerRepository =
    fastify.db.opportunityVolunteerRepository;
  const commRepo = fastify.db.communicationRepository;

  try {
    logger.debug(`emailSuggestion side-effect triggered (ov ${id})`);
    const ov = await opportunityVolunteerRepository.findOne({
      where: { id },
      relations: [
        "volunteer.person",
        "volunteer.person.users",
        "opportunity.deal.postcode",
        "opportunity.deal.dealTimeslot.timeslot",
        "opportunity.deal.dealLanguage.language",
        "opportunity.accompanying.postcode",
        "opportunity.onetimer",
        "opportunity.submittedByPerson",
        "opportunity.contactPerson",
      ],
    });
    if (!ov) {
      return;
    }
    const isAccompany =
      ov.opportunity?.type === ProfileVolunteeringType.ACCOMPANYING;
    const alreadySent = await commRepo.findOne({
      where: {
        volunteerId: ov.volunteerId,
        opportunityId: ov.opportunityId,
        communicationType: CommunicationType.FIRST_INQUIRY,
      },
    });
    if (alreadySent) {
      return;
    }
    const comm = await logEmailCommunication(
      commRepo,
      CommunicationType.FIRST_INQUIRY,
      {
        volunteerId: ov.volunteerId,
        opportunityId: ov.opportunityId,
      },
    );
    try {
      if (isAccompany) {
        await addTranslatedFields([ov.opportunity], Lang.DE);
        await fastify.notify.emailSuggestionAccompanying(ov);
      } else {
        await fastify.notify.emailSuggestion(ov);
      }
      logger.debug(`emailSuggestion side-effect succeeded (ov ${id})`);
    } catch (sendErr) {
      await commRepo.remove(comm).catch(logger.error);
      throw sendErr;
    }
  } catch (err) {
    logger.error(`emailSuggestion side-effect failed (ov ${id}): ${err}`);
  }
}

const AGENT_SETTABLE_STATUSES = new Set([
  OpportunityVolunteerStatusType.ACTIVE,
  OpportunityVolunteerStatusType.PAST,
]);
const AGENT_CHANGEABLE_STATUSES = new Set([
  OpportunityVolunteerStatusType.MATCHED,
  OpportunityVolunteerStatusType.ACTIVE,
]);
const AGENT_REMOVABLE_STATUSES = new Set([
  OpportunityVolunteerStatusType.PENDING,
  OpportunityVolunteerStatusType.MATCHED,
  OpportunityVolunteerStatusType.ACTIVE,
]);

function assertCoordinator(request: FastifyRequest): void {
  const role = request.authUser?.role;
  if (role !== UserRole.COORDINATOR && role !== UserRole.ADMIN) {
    throw new UnauthorizedError("Permission denied");
  }
}

async function assertCanChangeMatch(
  fastify: FastifyInstance,
  request: FastifyRequest,
  ov: OpportunityVolunteer,
  change: OpportunityVolunteerStatusType | "remove" | undefined,
): Promise<void> {
  if (request.authUser?.role !== UserRole.AGENT) {
    assertCoordinator(request);
    return;
  }
  const opportunity = await fastify.db.opportunityRepository.findOne({
    select: { id: true, agentId: true },
    where: { id: ov.opportunityId },
  });
  await assertAgentOwnsOpportunity(
    request,
    ov.opportunityId,
    opportunity?.agentId,
  );
  const agent = await fastify.db.agentRepository.findOne({
    select: { id: true, engagementStatus: true },
    where: { id: opportunity?.agentId },
  });
  if (agent?.engagementStatus === AgentEngagementStatusType.INACTIVE) {
    throw new UnauthorizedError("This NGO is inactive.");
  }
  const isAllowed =
    change === "remove"
      ? AGENT_REMOVABLE_STATUSES.has(ov.status)
      : change !== undefined &&
        AGENT_SETTABLE_STATUSES.has(change) &&
        AGENT_CHANGEABLE_STATUSES.has(ov.status);
  if (!isAllowed) {
    throw new UnauthorizedError("Permission denied");
  }
}

export default async function m2mOpportunityVolunteerRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) {
  fastify.addHook("onRequest", fastify.authenticate());

  fastify.post<{
    Body: Omit<OpportunityVolunteer, "opportunity" | "volunteer">;
    Reply: ReplyMessage;
  }>(
    "/",
    {
      preValidation: async (request) => assertCoordinator(request),
      schema: {
        body: { $ref: "ApiVolunteerOpportunityPost#" },
        response: responseSchema({ statusCode: 201 }),
      },
    },
    async (request, reply) => {
      const opportunityVolunteerRepository =
        fastify.db.opportunityVolunteerRepository;

      const { opportunityId, volunteerId } = request.body;

      if (
        await opportunityVolunteerRepository.findOneBy({
          opportunityId,
          volunteerId,
        })
      ) {
        throw new ConflictError(
          `A match already exists for opportunityId:${opportunityId}, volunteerId:${volunteerId}.`,
        );
      }

      const opportunityVolunteer = new OpportunityVolunteer(request.body);
      await opportunityVolunteerRepository.save(opportunityVolunteer, {
        data: { actorUserId: request.authUser?.id },
      });

      if (
        opportunityVolunteer.status === OpportunityVolunteerStatusType.PENDING
      ) {
        triggerEmailSuggestion(fastify, opportunityVolunteer.id);
      }

      return reply.status(201).send({
        message: `Created M2M opportunityId:${opportunityVolunteer.opportunityId}, volunteerId:${opportunityVolunteer.volunteerId}, status:${opportunityVolunteer.status}.`,
      });
    },
  );

  fastify.patch<{
    Params: ParamsId;
    Reply: null;
    Body: { status: OpportunityVolunteerStatusType };
  }>(
    "/:id",
    {
      schema: {
        params: idParamSchema,
        body: { $ref: "ApiOpportunityVolunteerPatch#" },
        response: responseSchema({ statusCode: 204 }),
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      const opportunityVolunteerRepository =
        fastify.db.opportunityVolunteerRepository;

      const opportunityVolunteer = await opportunityVolunteerRepository.findOne(
        {
          where: { id },
        },
      );

      if (!opportunityVolunteer) {
        throw new NotFoundError(`There's no M2M relation id:${id}`);
      }

      const prevStatus = opportunityVolunteer.status;
      const nextStatus = request.body.status;

      await assertCanChangeMatch(
        fastify,
        request,
        opportunityVolunteer,
        nextStatus,
      );

      const isAgent = request.authUser?.role === UserRole.AGENT;
      opportunityVolunteerRepository.merge(
        opportunityVolunteer,
        isAgent ? { status: nextStatus } : request.body,
      );
      await opportunityVolunteerRepository.save(opportunityVolunteer, {
        reload: true,
        data: { actorUserId: request.authUser?.id },
      });

      if (nextStatus && nextStatus !== prevStatus) {
        const commRepo = fastify.db.communicationRepository;

        if (nextStatus === OpportunityVolunteerStatusType.PENDING) {
          triggerEmailSuggestion(fastify, id);
        } else if (nextStatus === OpportunityVolunteerStatusType.MATCHED) {
          (async () => {
            try {
              const ov = await opportunityVolunteerRepository.findOne({
                where: { id },
                relations: [
                  "volunteer.person",
                  "volunteer.person.users",
                  "volunteer.deal.dealLanguage.language",
                  "volunteer.deal.dealSkill.skill",
                  "volunteer.deal.dealTimeslot.timeslot",
                  "opportunity.deal.dealLanguage.language",
                  "opportunity.submittedByPerson",
                  "opportunity.submittedByPerson.users",
                  "opportunity.contactPerson",
                  "opportunity.contactPerson.users",
                  "opportunity.agent.address.postcode",
                  "opportunity.agent.agentPerson.person",
                  "opportunity.agent.agentPerson.person.users",
                  "opportunity.accompanying.postcode",
                  "opportunity.onetimer",
                  "opportunity.district",
                ],
              });
              if (!ov) {
                return;
              }
              await addTranslatedFields(
                [ov.volunteer, ov.opportunity],
                Lang.DE,
              );
              const isAccompany =
                ov.opportunity?.type === ProfileVolunteeringType.ACCOMPANYING;
              const commType = isAccompany
                ? CommunicationType.ACCOMPANYING_MATCHED
                : CommunicationType.MATCHED;
              const alreadySent = await commRepo.findOne({
                where: {
                  volunteerId: ov.volunteerId,
                  opportunityId: ov.opportunityId,
                  communicationType: commType,
                },
              });
              if (alreadySent) {
                return;
              }
              if (isAccompany) {
                const comm = await logEmailCommunication(
                  commRepo,
                  CommunicationType.ACCOMPANYING_MATCHED,
                  {
                    volunteerId: ov.volunteerId,
                    opportunityId: ov.opportunityId,
                  },
                );
                try {
                  await fastify.notify.emailAccompanyMatch(ov);
                } catch (sendErr) {
                  await commRepo.remove(comm).catch(logger.error);
                  throw sendErr;
                }
                try {
                  await fastify.notify.emailAccompanyMatchVolunteer(ov);
                } catch (volunteerSendErr) {
                  logger.error(
                    `emailAccompanyMatchVolunteer failed (ov ${id}): ${volunteerSendErr}`,
                  );
                  fastify.notify
                    .opsAlert(
                      `emailAccompanyMatchVolunteer failed for ov ${id} (volunteer ${ov.volunteerId}, opportunity ${ov.opportunityId}) — the volunteer was not sent their appointment details: ${volunteerSendErr}`,
                    )
                    .catch(logger.error);
                }
              } else {
                const comm = await logEmailCommunication(
                  commRepo,
                  CommunicationType.MATCHED,
                  {
                    volunteerId: ov.volunteerId,
                    opportunityId: ov.opportunityId,
                  },
                );
                try {
                  await fastify.notify.emailIntroduction(ov);
                } catch (sendErr) {
                  await commRepo.remove(comm).catch(logger.error);
                  throw sendErr;
                }
              }
            } catch (err) {
              logger.error(
                `emailMatched side-effect failed (ov ${id}): ${err}`,
              );
            }
          })();
        }
      }

      return reply.status(204).send();
    },
  );

  fastify.delete<{
    Params: ParamsId;
    Reply: null;
  }>(
    "/:id",
    {
      schema: {
        params: idParamSchema,
        response: responseSchema({ statusCode: 204 }),
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      const opportunityVolunteerRepository =
        fastify.db.opportunityVolunteerRepository;

      const m2mInstance = await opportunityVolunteerRepository.findOne({
        where: { id },
      });

      if (!m2mInstance) {
        throw new NotFoundError(`There's no M2M relation id:${id}`);
      }

      await assertCanChangeMatch(fastify, request, m2mInstance, "remove");

      await deleteMatch(
        opportunityVolunteerRepository.manager,
        m2mInstance,
        request.authUser?.id,
      );
      await updateVolunteerMatching(m2mInstance.volunteerId);
      await updateOpportunityMatching(m2mInstance.opportunityId);

      return reply.status(204).send();
    },
  );
}
