import { FastifyInstance, FastifyPluginOptions } from "fastify";
import fp from "fastify-plugin";

import { responseErrors } from "../schema/responseErrors";
import { responseSchema } from "../schema/response-schema";
import { RoutePrefix } from "../types";

async function healthRoutes(
  fastify: FastifyInstance,
  options: FastifyPluginOptions,
) {
  const prefixedPath = options.prefix || RoutePrefix.HEALTH_CHECK;

  const schema = {
    response: responseSchema("message"),
  };

  fastify.get(prefixedPath, { schema }, async (request, reply) => {
    try {
      return reply.status(200).send({
        message: "Need4Deed API v1 is up and running.",
      });
    } catch (error) {
      fastify.log.error(`Health check error: ${error}`);
      return reply.status(500).send({
        message: "Internal server error.",
      });
    }
  });
}

export default fp(healthRoutes, {
  name: "health-routes",
});
