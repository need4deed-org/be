import rateLimit from "@fastify/rate-limit";
import { FastifyInstance } from "fastify";
import fp from "fastify-plugin";

async function rateLimitPlugin(fastify: FastifyInstance) {
  await fastify.register(rateLimit, {
    global: false,
    cache: 5000,
    errorResponseBuilder() {
      return {
        statusCode: 429,
        error: "Too Many Requests",
        message: `Rate limit exceeded`,
      };
    },
  });
}

export default fp(rateLimitPlugin, {
  name: "rate-limit-plugin",
});
