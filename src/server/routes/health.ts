import { FastifyInstance, FastifyPluginOptions } from "fastify";
import fp from "fastify-plugin";

import { responseErrors } from "../../data/schema/responseErrors";
import { RoutePrefix } from "../types";

async function healthRoutes(
  fastify: FastifyInstance,
  options: FastifyPluginOptions,
) {
  const prefixedPath = options.prefix || RoutePrefix.HEALTH_CHECK;

  const schema = {
    response: {
      200: {
        type: "object",
        properties: {
          message: { type: "string" },
        },
        required: ["message"],
      },
      ...responseErrors,
    },
  };

  fastify.get(prefixedPath, { schema }, async (request, reply) => {
    return reply.status(200).send({
      message: "Need4Deed API v1 is up and running.",
    });
  });
}

export default fp(healthRoutes, {
  name: "health-routes",
});
