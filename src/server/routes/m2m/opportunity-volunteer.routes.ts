import { FastifyInstance, FastifyPluginOptions } from "fastify";
import {
  CommunicationType,
  OpportunityVolunteerStatusType,
  ProfileVolunteeringType,
  UserRole,
} from "need4deed-sdk";
import { ConflictError, NotFoundError } from "../../../config";
import OpportunityVolunteer from "../../../data/entity/m2m/opportunity-volunteer";
import logger from "../../../logger";
import { idParamSchema, responseSchema } from "../../schema";
import { ParamsId, ReplyMessage } from "../../types";
import { logEmailCommunication } from "../../utils/data/log-email-communication";

// Sends the FIRST_INQUIRY "suggest" email for an OV that is (now) PENDING.
// Called both right after creation (POST, which can create straight into
// PENDING) and on a status transition into PENDING via PATCH (e.g. a
// PENDING→DECLINED→PENDING re-toggle). Fire-and-forget: callers invoke this
// without awaiting so a DB/send hiccup never affects the HTTP response.
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
        "volunteer.deal.postcode",
        "volunteer.deal.dealTimeslot.timeslot",
        "opportunity.submittedByPerson",
        "opportunity.contactPerson",
      ],
    });
    if (!ov) {
      return;
    }
    // Skip if FIRST_INQUIRY already sent (e.g. PENDING→DECLINED→PENDING).
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
    // Log before send; remove the dedup record on failure so the next toggle can retry.
    const comm = await logEmailCommunication(
      commRepo,
      CommunicationType.FIRST_INQUIRY,
      {
        volunteerId: ov.volunteerId,
        opportunityId: ov.opportunityId,
      },
    );
    try {
      await fastify.notify.emailSuggestion(ov);
      logger.debug(`emailSuggestion side-effect succeeded (ov ${id})`);
    } catch (sendErr) {
      await commRepo.remove(comm).catch(logger.error);
      throw sendErr;
    }
  } catch (err) {
    logger.error(`emailSuggestion side-effect failed (ov ${id}): ${err}`);
  }
}

export default async function m2mOpportunityVolunteerRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) {
  fastify.addHook(
    "onRequest",
    fastify.authenticate({ role: UserRole.COORDINATOR }),
  );

  fastify.post<{
    Body: Omit<OpportunityVolunteer, "opportunity" | "volunteer">;
    Reply: ReplyMessage;
  }>(
    "/",
    {
      schema: {
        body: { $ref: "ApiVolunteerOpportunityPost#" },
        response: responseSchema({ statusCode: 201 }),
      },
    },
    async (request, reply) => {
      const opportunityVolunteerRepository =
        fastify.db.opportunityVolunteerRepository;

      const { opportunityId, volunteerId } = request.body;

      // Surface the duplicate-pair case as 409 up front (the DB unique
      // constraint on (opportunityId, volunteerId) remains the ultimate
      // guard for the rare race).
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
      await opportunityVolunteerRepository.save(opportunityVolunteer);

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

      opportunityVolunteerRepository.merge(opportunityVolunteer, request.body);
      await opportunityVolunteerRepository.save(opportunityVolunteer, {
        reload: true,
      });

      if (nextStatus && nextStatus !== prevStatus) {
        const commRepo = fastify.db.communicationRepository;

        if (nextStatus === OpportunityVolunteerStatusType.PENDING) {
          triggerEmailSuggestion(fastify, id);
        } else if (nextStatus === OpportunityVolunteerStatusType.MATCHED) {
          (async () => {
            try {
              // findOne inside the IIFE: handler returns 204 immediately;
              // a DB hiccup here doesn't affect the HTTP response.
              const ov = await opportunityVolunteerRepository.findOne({
                where: { id },
                relations: [
                  "volunteer.person",
                  "volunteer.person.users",
                  "volunteer.deal.dealLanguage.language",
                  "volunteer.deal.dealSkill.skill",
                  "volunteer.deal.dealTimeslot.timeslot",
                  "opportunity.submittedByPerson",
                  "opportunity.submittedByPerson.users",
                  "opportunity.contactPerson",
                  "opportunity.contactPerson.users",
                  "opportunity.agent.address.postcode",
                  "opportunity.agent.agentPerson.person",
                  "opportunity.agent.agentPerson.person.users",
                  "opportunity.accompanying.postcode",
                  "opportunity.district",
                ],
              });
              if (!ov) {
                return;
              }
              const isAccompany =
                ov.opportunity?.type === ProfileVolunteeringType.ACCOMPANYING;
              const commType = isAccompany
                ? CommunicationType.ACCOMPANYING_MATCHED
                : CommunicationType.MATCHED;
              // Skip if a match email was already sent for this pair.
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
                // Log before send; remove the dedup record on failure so the next toggle can retry.
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

      await opportunityVolunteerRepository.delete({ id });

      return reply.status(204).send();
    },
  );
}
