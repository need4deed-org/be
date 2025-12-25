import fastifyJwt from "@fastify/jwt";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import { UserRole } from "need4deed-sdk";
import { accessCookieName, cookieOptions } from "../../config/constants";
import { AuthOptions } from "../types";

async function jwtPlugin(
  fastify: FastifyInstance,
  options: { secret: string },
) {
  fastify.register(fastifyJwt, {
    secret: options.secret,
    cookie: {
      cookieName: accessCookieName,
      ...cookieOptions,
    },
  });

  fastify.decorate("authenticate", function (opt?: AuthOptions) {
    return async function (request: FastifyRequest, reply: FastifyReply) {
      try {
        try {
          await request.jwtVerify();
        } catch (_error) {
          reply.status(401);
          throw new Error("Authorization failed.");
        }

        const userId = request.user?.id;
        fastify.log.debug(`jwtPlugin:authenticated: ${userId}`);

        const userRepository = fastify.db.userRepository;
        if (!userRepository) {
          throw new Error("User repository is not initialized.");
        }

        const user = await userRepository.findOne({
          where: { id: userId },
        });

        if (!user) {
          reply.status(404);
          throw new Error("User not found.");
        }

        if (user.role === UserRole.ADMIN) {
          reply.status(200);
          return;
        }

        const { role, allowSelf } = opt || {};

        fastify.log.debug(
          `authenticate role:${role}, allowSelf:${allowSelf}, userId:${userId}`,
        );

        if (role && role !== user.role) {
          reply.status(403);
          throw new Error("Permission denied");
        }

        if (allowSelf) {
          const requestParamId = (request.params as { id?: string }).id;
          if (String(userId) !== requestParamId) {
            reply.status(403);
            throw new Error("Permission denied");
          }
        }
      } catch (error) {
        fastify.log.warn(`JWT verification failed: ${error.message}`); // Log the warning
        reply.send({
          message: `Authentication failed: ${error.message}`,
          error: error.message,
        });
      }
    };
  });
}

export default fp(jwtPlugin, {
  name: "jwt-auth-plugin",
});
