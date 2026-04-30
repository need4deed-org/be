import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { UserRole } from "need4deed-sdk";
import { nidsToken } from "../../config";
import { responseSchema } from "../schema";
import { ReplyMessage } from "../types";

export default async function workerRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) {
  fastify.addHook("onRequest", fastify.authenticate({ role: UserRole.ADMIN }));

  fastify.get<{
    Querystring: { nids: string; dumps: string };
    Reply: ReplyMessage;
  }>(
    "/",
    {
      schema: {
        querystring: {
          type: "object",
          properties: { nids: { type: "string" } },
        },
        response: responseSchema(""),
      },
    },
    async (request, reply) => {
      const { nids } = request.query;
      if (!nids) {
        return reply.status(400).send({
          message: "Missing 'nids' query parameter.",
        });
      }
      if (nids === nidsToken) {
        return reply.status(200).send({
          message: "NID seeding completed.",
        });
      }
      return reply.status(204).send({
        message: "Completed.",
      });
    },
  );
}
