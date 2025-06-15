import { FastifyInstance, FastifyPluginOptions } from "fastify";
import fp from "fastify-plugin";

async function authRoutes(
  fastify: FastifyInstance,
  options: FastifyPluginOptions,
) {
  const prefixedPath = options.prefix || "/auth";

  fastify.post(prefixedPath + "/login", async (request, reply) => {
    const { email, password } = request.body as {
      email: string;
      password: string;
    };

    if (!email || !password) {
      return reply.status(400).send({ message: "Bad credentials." });
    }
  });
}

export default fp(authRoutes, {
  name: "auth-routes",
  dependencies: ["typeorm-plugin"],
});
