import { FastifyInstance, FastifyPluginOptions } from "fastify";
import {
  CommunicationType,
  OpportunityVolunteerStatusType,
  ProfileVolunteeringType,
  UserRole,
} from "need4deed-sdk";
import { BadRequestError, NotFoundError } from "../../../config";
import OpportunityVolunteer from "../../../data/entity/m2m/opportunity-volunteer";
import logger from "../../../logger";
import { idParamSchema, responseSchema } from "../../schema";
import { ParamsId, ReplyMessage } from "../../types";
import { logEmailCommunication } from "../../utils/data/log-email-communication";

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

      const opportunityVolunteer = new OpportunityVolunteer(request.body);
      await opportunityVolunteerRepository.save(opportunityVolunteer);

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
      if (id <= 0) {
        throw new BadRequestError(
          `Wrong id:${id} param. It must be a positive number`,
        );
      }

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
          const ov = await opportunityVolunteerRepository.findOne({
            where: { id },
            relations: [
              "volunteer.person",
              "volunteer.person.users",
              "volunteer.deal.postcode",
              "volunteer.deal.dealTimeslot.timeslot",
              "opportunity",
            ],
          });
          if (ov) {
            (async () => {
              try {
                await fastify.notify.emailSuggestion(ov);
                await logEmailCommunication(
                  commRepo,
                  CommunicationType.FIRST_INQUIRY,
                  {
                    volunteerId: ov.volunteerId,
                    opportunityId: ov.opportunityId,
                  },
                );
              } catch (err) {
                logger.error(
                  `emailSuggestion side-effect failed (ov ${id}): ${err}`,
                );
              }
            })();
          }
        } else if (nextStatus === OpportunityVolunteerStatusType.MATCHED) {
          const ov = await opportunityVolunteerRepository.findOne({
            where: { id },
            relations: [
              "volunteer.person",
              "volunteer.person.users",
              "volunteer.deal.dealLanguage.language",
              "volunteer.deal.dealSkill.skill",
              "volunteer.deal.dealTimeslot.timeslot",
              "opportunity.contactPerson",
              "opportunity.contactPerson.users",
              "opportunity.agent.address.postcode",
              "opportunity.accompanying.postcode",
              "opportunity.district",
            ],
          });
          if (ov) {
            const isAccompany =
              ov.opportunity?.type === ProfileVolunteeringType.ACCOMPANYING;
            (async () => {
              try {
                if (isAccompany) {
                  await fastify.notify.emailAccompanyMatch(ov);
                  await logEmailCommunication(
                    commRepo,
                    CommunicationType.ACCOMPANYING_MATCHED,
                    { opportunityId: ov.opportunityId },
                  );
                } else {
                  await fastify.notify.emailIntroduction(ov);
                  await logEmailCommunication(
                    commRepo,
                    CommunicationType.MATCHED,
                    {
                      volunteerId: ov.volunteerId,
                      opportunityId: ov.opportunityId,
                    },
                  );
                }
              } catch (err) {
                logger.error(
                  `emailMatched side-effect failed (ov ${id}): ${err}`,
                );
              }
            })();
          }
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
      if (id <= 0) {
        throw new BadRequestError("Param id must ba a positive number");
      }

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
