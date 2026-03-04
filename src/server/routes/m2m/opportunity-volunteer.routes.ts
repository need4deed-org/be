import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { UserRole } from "need4deed-sdk";
import { BadRequestError, NotFoundError } from "../../../config";
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

  fastify.post("/", async (_request, _reply) => {});

  fastify.patch("/:id", async (_request, _reply) => {});

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
