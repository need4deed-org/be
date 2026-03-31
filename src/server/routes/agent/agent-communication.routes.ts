import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { ApiCommunicationGet, ApiCommunicationPost } from "need4deed-sdk";
import { dtoCommunication } from "../../../services";
import { idParamSchema, responseSchema } from "../../schema";
import { ParamsId, ReplyDataCount } from "../../types";

export default function agentCommunicationRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) {
  fastify.get<{
    Params: ParamsId;
    Reply: ReplyDataCount<ApiCommunicationGet[]>;
  }>(
    `/`,
    {
      schema: {
        params: idParamSchema,
        response: responseSchema("ApiCommunicationGet#", true),
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      const communicationRepository = fastify.db.communicationRepository;
      const [communications, count] =
        await communicationRepository.findAndCount({
          where: { agentId: id },
        });

      const data = communications.map(dtoCommunication);

      return reply.status(200).send({
        message: `Agent (id:${id}) communications fetched successfully`,
        data,
        count,
      });
    },
  );

  fastify.post<{ Params: ParamsId; Body: ApiCommunicationPost }>(
    "/",
    {
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
