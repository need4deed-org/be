import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { responseErrors } from "../schema";

type HealthReply = { message: string; commit: string };

export default async function healthRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) {
  fastify.get<{ Reply: HealthReply }>(
    "/",
    {
      schema: {
        response: {
          200: {
            type: "object",
            properties: {
              message: { type: "string" },
              commit: { type: "string" },
            },
            required: ["message", "commit"],
            additionalProperties: false,
          },
          ...responseErrors,
        },
      },
    },
    async (_request, reply) => {
      return reply.status(200).send({
        message: "Need4Deed API v1 is up and running.",
        commit: process.env.GIT_COMMIT_SHA ?? "unknown",
      });
    },
  );
}
