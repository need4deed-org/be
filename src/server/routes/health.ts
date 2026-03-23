import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { responseSchema } from "../schema";
import { ReplyMessage } from "../types";

export default async function healthRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) {
  fastify.get<{ Reply: ReplyMessage }>(
    "/",
    { schema: { response: responseSchema("") } },
    async (_request, reply) => {
      return reply.status(200).send({
        message: "Need4Deed API v1 is up and running.",
      });
    },
  );
}
