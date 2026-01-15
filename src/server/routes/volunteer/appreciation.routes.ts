import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { ApiAppreciationGet, ApiAppreciationPost } from "need4deed-sdk";
import { idParamSchema, responseErrors } from "../../schema";

export default function volunteerAppreciationRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) {
  fastify.get<{
    Params: { id: string };
    Reply: {
      message: string;
      data?: ApiAppreciationGet[];
    };
  }>(
    "/",
    {
      schema: {
        params: idParamSchema,
        response: {
          200: {
            type: "object",
            properties: {
              message: { type: "string" },
              data: { type: "array", items: { $ref: "ApiAppreciationGet#" } },
            },
            required: ["message", "data"],
          },
          ...responseErrors,
        },
      },
    },
    async (request, reply) => {
      const volunteerId = Number(request.params.id);

      const appreciationRepository = fastify.db.appreciationRepository;
      const appreciations = await appreciationRepository.find({
        where: {
          volunteerId,
        },
      });

      return reply.status(200).send({
        message: `List of appreciations for volunteer_id:${volunteerId}`,
        data: appreciations,
      });
    },
  );

  fastify.post<{ Params: { id: number }; Body: ApiAppreciationPost }>(
    "/",
    {
      schema: {
        params: idParamSchema,
        body: { $ref: "ApiAppreciationPost#" },
        response: {
          201: {
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
      const volunteerId = Number(request.params.id);
      const appreciationData = request.body;

      const appreciationRepository = fastify.db.appreciationRepository;
      const newAppreciation = appreciationRepository.create({
        ...appreciationData,
        volunteerId,
      });

      const savedAppreciation =
        await appreciationRepository.save(newAppreciation);

      return reply.status(201).send({
        message: `Appreciation for volunteer_id:${volunteerId} created successfully.`,
        data: savedAppreciation,
      });
    },
  );
}
