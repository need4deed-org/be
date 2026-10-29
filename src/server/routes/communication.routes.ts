import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { ApiVolunteerCommunicationPatch, UserRole } from "need4deed-sdk";
import { dtoCommunication } from "../../services/dto/dto-communication";
import { idParamSchema } from "../schema";
import { assertCommunicationAuthor } from "../utils";

export default async function communicationRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) {
  await fastify.addHook(
    "onRequest",
    fastify.authenticate({ role: UserRole.COORDINATOR }),
  );

  fastify.patch<{
    Params: { id: string };
    Body: ApiVolunteerCommunicationPatch;
  }>(
    "/:id",
    {
      schema: {
        params: idParamSchema,
        body: { $ref: "ApiCommunicationPatch#" },
        response: {
          200: {
            type: "object",
            properties: {
              message: { type: "string" },
              data: { $ref: "ApiCommunicationGet#" },
            },
            required: ["message", "data"],
          },
        },
      },
    },
    async (request, reply) => {
      const id = Number(request.params.id);

      const communicationRepository = fastify.db.communicationRepository;
      const communication = await communicationRepository.findOne({
        where: { id },
      });

      if (!communication) {
        return reply.status(404).send({
          message: `Communication with id:${id} not found.`,
        });
      }

      assertCommunicationAuthor(communication, request.user, "update");

      const updatedCommunication = await communicationRepository.save({
        ...communication,
        ...request.body,
      });

      return reply.status(200).send({
        message: `Communication with id:${id} updated.`,
        data: dtoCommunication(updatedCommunication),
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

      const communicationRepository = fastify.db.communicationRepository;
      const communication = await communicationRepository.findOne({
        where: { id },
      });

      if (!communication) {
        return reply.status(404).send({
          message: `Communication with id:${id} not found.`,
        });
      }

      assertCommunicationAuthor(communication, request.user, "delete");

      await communicationRepository.remove(communication);

      return reply.status(200).send({
        message: `Communication with id:${id} deleted.`,
      });
    },
  );
}
