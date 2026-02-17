import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { ApiAppreciationGet, ApiAppreciationPost } from "need4deed-sdk";
import { dtoAppreciation } from "../../../services/dto/dto-appreciation";
import { idParamSchema, responseErrors } from "../../schema";
import { responseSchema } from "../../schema";

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
        response: responseSchema("ApiAppreciationGet", true),
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

      const data = appreciations.map(dtoAppreciation);

      return reply.status(200).send({
        message: `List of appreciations for volunteer_id:${volunteerId}`,
        data,
      });
    },
  );

  fastify.post<{ Params: { id: number }; Body: ApiAppreciationPost }>(
    "/",
    {
      schema: {
        params: idParamSchema,
        body: { $ref: "ApiAppreciationPost#" },
        response: responseSchema("ApiAppreciationGet"),
      },
    },
    async (request, reply) => {
      const volunteerId = Number(request.params.id);
      const userId = request.user.id;
      const appreciationData = request.body;

      const appreciationRepository = fastify.db.appreciationRepository;
      const newAppreciation = appreciationRepository.create({
        ...appreciationData,
        volunteerId,
        userId,
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
