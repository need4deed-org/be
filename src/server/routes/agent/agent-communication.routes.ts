import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { ApiCommunicationPost, UserRole } from "need4deed-sdk";
import Communication from "../../../data/entity/communication.entity";
import { dtoCommunication } from "../../../services";
import { idParamSchema, responseSchema } from "../../schema";
import { ParamsId, ReplyDataCount } from "../../types";
import { makePiiSerialization } from "../../utils/pii/pre-serialization";

export default function agentCommunicationRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) {
  fastify.get<{
    Params: ParamsId;
    // Handler sends entities; the DTO (ApiCommunicationGet) runs in the
    // preSerialization hook.
    Reply: ReplyDataCount<Communication[]>;
  }>(
    `/`,
    {
      schema: {
        params: idParamSchema,
        response: responseSchema("ApiCommunicationGet#", true),
      },
      preSerialization: makePiiSerialization(dtoCommunication),
    },
    async (request, reply) => {
      const { id } = request.params;

      const communicationRepository = fastify.db.communicationRepository;
      const [communications, count] =
        await communicationRepository.findAndCount({
          where: { agentId: id },
        });

      // DTO runs in the preSerialization hook after PII masking.
      return reply.status(200).send({
        message: `Agent (id:${id}) communications fetched successfully`,
        data: communications,
        count,
      });
    },
  );

  fastify.post<{ Params: ParamsId; Body: ApiCommunicationPost }>(
    "/",
    {
      onRequest: fastify.authenticate({ role: UserRole.COORDINATOR }),
      schema: {
        params: idParamSchema,
        body: { $ref: "ApiCommunicationPost#" },
        response: responseSchema("ApiCommunicationGet#"),
      },
    },
    async (request, reply) => {
      const agentId = Number(request.params.id);

      const communicationRepository = fastify.db.communicationRepository;
      const communication = await communicationRepository.save({
        ...request.body,
        userId: request.user.id,
        agentId,
      });

      return reply.status(200).send({
        message: `Communication created for agent_id:${agentId}`,
        data: communication,
      });
    },
  );
}
