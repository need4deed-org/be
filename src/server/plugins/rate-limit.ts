import rateLimit from "@fastify/rate-limit";
import { FastifyInstance } from "fastify";
import fp from "fastify-plugin";

async function rateLimitPlugin(fastify: FastifyInstance) {
  await fastify.register(rateLimit, {
    global: false,
    cache: 5000,
  });
}

export default fp(rateLimitPlugin, {
  name: "rate-limit-plugin",
});
