import { FastifyInstance, FastifyPluginOptions } from "fastify";
import fp from "fastify-plugin";
import { responseErrors } from "../../data/schema/responseErrors";
import {
  userLoginResponseSchema,
  userLoginSchema,
} from "../../data/schema/user.schema";
import { RoutePrefix } from "../types";

async function authRoutes(
  fastify: FastifyInstance,
  options: FastifyPluginOptions,
) {
  const prefixedPath = options.prefix || RoutePrefix.AUTH;

  fastify.post<{
    Body: {
      email: string;
      password: string;
    };
    Reply: { message: string; data?: { token: string }; errors?: any };
  }>(
    prefixedPath + RoutePrefix.LOGIN,
    {
      schema: {
        body: userLoginSchema,
        response: {
          200: userLoginResponseSchema,
          ...responseErrors,
        },
      },
    },
    async (request, reply) => {
      const { email, password } = request.body;

      if (!email || !password) {
        return reply.status(400).send({ message: "Bad credentials." });
      }

      try {
        fastify.log.debug(`Attempting to authenticate: ${email}/${password}`);

        const userRepository = fastify.db.userRepository;
        if (!userRepository) {
          throw new Error("User repository is not initialized.");
        }

        const user = await userRepository.findOne({
          where: { email },
        });
        if (!user) {
          return reply.status(404).send({ message: "User not found." });
        }

        if (!user.isActive) {
          return reply.status(403).send({ message: "User is not active." });
        }

        if (!(await user.checkPassword(password))) {
          return reply.status(401).send({ message: "Bad credentials." });
        }

        const token = fastify.jwt.sign({ id: user.id, email: user.email });

        if (!token) {
          throw new Error("No token.");
        }

        reply.status(200).send({
          message: "Login successful.",
          data: { token },
        });
      } catch (error) {
        fastify.log.error(`Authentication error: ${error.message}`);
        return reply.status(500).send({ message: "Internal server error." });
      }
    },
  );
}

export default fp(authRoutes, {
  name: "auth-routes",
  dependencies: ["typeorm-plugin"],
});
