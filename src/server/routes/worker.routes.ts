import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { nidsToken } from "../../config";
import { dataSource } from "../../data/data-source";
import { seedNids } from "../../data/seeds/nid.seed";
import { responseSchema } from "../schema";
import { ReplyMessage } from "../types";

export default async function workerRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) {
  fastify.post<{ Querystring: { nids: string }; Reply: ReplyMessage }>(
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
        await seedNids(dataSource);
      }
      return reply.status(200).send({
        message: "NID seeding completed.",
      });
    },
  );
}
