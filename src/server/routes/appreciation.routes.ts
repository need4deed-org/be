import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { ApiAppreciationPatch, UserRole } from "need4deed-sdk";
import { NotFoundError, UnauthorizedError } from "../../config/error/fastify";
import { idParamSchema } from "../schema";
import { validatePermissions } from "../utils";

export default async function appreciationRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) {
  await fastify.addHook(
    "onRequest",
    fastify.authenticate({ role: UserRole.COORDINATOR }),
  );

  fastify.patch<{
    Params: { id: string };
    Body: ApiAppreciationPatch;
  }>(
    "/:id",
    {
      schema: {
        params: idParamSchema,
        body: { $ref: "ApiAppreciationPatch#" },
        response: {
          200: {
            type: "object",
            properties: {
              message: { type: "string" },
              data: { $ref: "ApiAppreciationGet#" },
            },
            required: ["message", "data"],
          },
        },
      },
    },
    async (request, reply) => {
      const id = Number(request.params.id);

      const appreciationRepository = fastify.db.appreciationRepository;
      const appreciation = await appreciationRepository.findOne({
        where: { id },
      });

      if (!appreciation) {
        throw new NotFoundError(`Appreciation with id:${id} not found.`);
      }

      if (
        !validatePermissions(
          appreciation,
          [UserRole.ADMIN, UserRole.COORDINATOR],
          request.user,
        )
      ) {
        throw new UnauthorizedError(
          `Permission denied, appreciation with id:${id} not updated.`,
        );
      }

      const updatedAppreciation = await appreciationRepository.save({
        ...appreciation,
        ...request.body,
      });

      return reply.status(200).send({
        message: `Appreciation with id:${id} updated.`,
        data: updatedAppreciation,
      });
    },
  );

  fastify.delete<{ Params: { id: string } }>(
    "/:id",
    {
      schema: {
        params: idParamSchema,
        response: {
          200: {
            type: "object",
            properties: {
              message: { type: "string" },
            },
            required: ["message"],
          },
        },
      },
    },
    async (request, reply) => {
      const id = Number(request.params.id);

      const appreciationRepository = fastify.db.appreciationRepository;
      const appreciation = await appreciationRepository.findOne({
        where: { id },
      });

      if (!appreciation) {
        throw new NotFoundError(`Appreciation with id:${id} not found.`);
      }

      if (
        !validatePermissions(
          appreciation,
          [UserRole.ADMIN, UserRole.COORDINATOR],
          request.user,
        )
      ) {
        throw new UnauthorizedError(
          `Permission denied, appreciation with id:${id} not deleted.`,
        );
      }

      await appreciationRepository.remove(appreciation);

      return reply.status(200).send({
        message: `Appreciation with id:${id} deleted.`,
      });
    },
  );
}
