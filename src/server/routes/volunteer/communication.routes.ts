import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { ApiVolunteerCommunicationPost } from "need4deed-sdk";
import { idParamSchema } from "../../schema";

export default function volunteerCommunicationRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) {
  fastify.get<{ Params: { id: string } }>(
    "/",
    {
      schema: {
        params: idParamSchema,
        response: {
          200: {
            type: "object",
            properties: {
              message: { type: "string" },
              data: { type: "array", items: { $ref: "ApiCommunicationGet#" } },
            },
            required: ["message", "data"],
          },
        },
      },
      onRequest: [fastify.authenticate()],
    },
    async (request, reply) => {
      const volunteerId = Number(request.params.id);

      const communicationRepository = fastify.db.communicationRepository;
      const communications = await communicationRepository.find({
        where: {
          volunteerId,
        },
      });

      return reply.status(200).send({
        message: `List of communications for volunteer_id:${volunteerId}`,
        data: communications,
      });
    },
  );

  fastify.post<{ Params: { id: number }; Body: ApiVolunteerCommunicationPost }>(
    "/",
    {
      schema: {
        params: idParamSchema,
        body: { $ref: "ApiCommunicationPost#" },
        response: {
          201: {
            type: "object",
            properties: {
              message: { type: "string" },
              data: { $ref: "ApiCommunicationGet#" },
            },
            required: ["message", "data"],
          },
        },
      },
      onRequest: [fastify.authenticate()],
    },
    async (request, reply) => {
      const volunteerId = Number(request.params.id);

      const communicationRepository = fastify.db.communicationRepository;
      const communication = await communicationRepository.save({
        ...request.body,
        userId: request.user.id,
        volunteerId,
      });

      return reply.status(201).send({
        message: `Communication created for volunteer_id:${volunteerId}`,
        data: communication,
      });
    },
  );
}
