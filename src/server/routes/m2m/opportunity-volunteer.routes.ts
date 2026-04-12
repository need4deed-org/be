import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { OpportunityVolunteerStatusType, UserRole } from "need4deed-sdk";
import { BadRequestError, NotFoundError } from "../../../config";
import OpportunityVolunteer from "../../../data/entity/m2m/opportunity-volunteer";
import { idParamSchema, responseSchema } from "../../schema";
import { ParamsId, ReplyMessage } from "../../types";

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
        response: responseSchema(""),
      },
    },
    async (request, reply) => {
      const opportunityVolunteerRepository =
        fastify.db.opportunityVolunteerRepository;

      const opportunityVolunteer = new OpportunityVolunteer(request.body);
      await opportunityVolunteerRepository.save(opportunityVolunteer);

      return reply.status(200).send({
        message: `Created M2M opportunityId:${opportunityVolunteer.opportunityId}, volunteerId:${opportunityVolunteer.volunteerId}, status:${opportunityVolunteer.status}.`,
      });
    },
  );

  fastify.patch<{
    Params: ParamsId;
    Reply: ReplyMessage;
    Body: { status: OpportunityVolunteerStatusType };
  }>(
    "/:id",
    {
      schema: {
        params: idParamSchema,
        body: { $ref: "ApiOpportunityVolunteerPatch#" },
        response: responseSchema(""),
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

      opportunityVolunteerRepository.merge(opportunityVolunteer, request.body);
      await opportunityVolunteerRepository.save(opportunityVolunteer, {
        reload: true,
      });

      return reply.status(200).send({
        message: `M2M relation id:${id} has been updated.`,
      });
    },
  );

  fastify.delete<{
    Params: ParamsId;
    Reply: ReplyMessage;
  }>(
    "/:id",
    {
      schema: {
        params: idParamSchema,
        response: responseSchema(""),
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

      return reply.status(200).send({
        message: `M2M relation id:${id} has been deleted.`,
      });
    },
  );
}
