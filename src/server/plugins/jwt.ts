import fastifyJwt from "@fastify/jwt";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";

import { Role } from "../../data/types";
import { AuthOptions } from "../types";

async function jwtPlugin(
  fastify: FastifyInstance,
  options: { secret: string },
) {
  fastify.register(fastifyJwt, {
    secret: options.secret,
  });

  fastify.decorate("authenticate", function (opt?: AuthOptions) {
    return async function (request: FastifyRequest, reply: FastifyReply) {
      try {
        await request.jwtVerify();

        const userId = request.user?.id;
        fastify.log.debug(`jwtPlugin:authenticated: ${userId}}`);

        const user = await fastify.db.userRepository.findOne({
          where: { id: userId },
        });

        if (!user) {
          throw new Error("User not found.");
        }

        if (user.role === Role.ADMIN) {
          return;
        }

        const { role, allowSelf } = opt || {};

        fastify.log.debug(
          `authenticate role:${role}, allowSelf:${allowSelf}, userId:${userId}`,
        );

        if (role && role !== user.role) {
          throw new Error("Permission denied");
        }

        if (allowSelf) {
          const requestParamId = (request.params as { id?: string }).id;
          if (String(userId) !== requestParamId) {
            throw new Error("Permission denied");
          }
        }
      } catch (error) {
        fastify.log.warn(`JWT verification failed: ${error.message}`); // Log the warning
        reply.code(401).send({
          message: "Authentication failed.",
          error: error.message,
        });
      }
    };
  });

  fastify.log.debug(
    "JWT plugin loaded and Fastify instance decorated with `jwt` and `authenticate`.",
  );
}

export default fp(jwtPlugin, {
  name: "jwt-auth-plugin",
});
