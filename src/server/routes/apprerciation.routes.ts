import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { ApiAppreciationPatch, UserRole } from "need4deed-sdk";
import Appreciation from "../../data/entity/volunteer/appreciation.entity";
import { idParamSchema } from "../schema";

function validateAppreciationOwnership(
  appreciation: Appreciation,
  user: { id: number; role: UserRole },
): boolean {
  return (
    appreciation.userId === user.id ||
    user.role === UserRole.ADMIN ||
    user.role === UserRole.COORDINATOR
  );
}

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
        return reply.status(404).send({
          message: `Appreciation with id:${id} not found.`,
        });
      }

      if (!validateAppreciationOwnership(appreciation, request.user)) {
        return reply.status(403).send({
          message: `Permission denied, appreciation with id:${id} not patched.`,
        });
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
        return reply.status(404).send({
          message: `Appreciation with id:${id} not found.`,
        });
      }

      if (!validateAppreciationOwnership(appreciation, request.user)) {
        return reply.status(403).send({
          message: `Permission denied, appreciation with id:${id} not deleted.`,
        });
      }

      await appreciationRepository.remove(appreciation);

      return reply.status(200).send({
        message: `Appreciation with id:${id} deleted.`,
      });
    },
  );
}
