import fastifyJwt from "@fastify/jwt";
import { FastifyInstance, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import { UserRole } from "need4deed-sdk";
import { UnauthenticatedError, UnauthorizedError } from "../../config";
import { accessCookieName, cookieOptions } from "../../config/constants";
import logger from "../../logger";
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
    return async function (request: FastifyRequest) {
      logger.debug(
        `jwtPlugin:authenticate called with request.routeOptions.config: ${JSON.stringify(request.routeOptions.config)}`,
      );
      const config = request.routeOptions.config as
        | { public?: boolean }
        | undefined;

      if (config?.public === true) {
        return;
      }

      try {
        await request.jwtVerify();
      } catch {
        throw new UnauthenticatedError("Authorization failed.");
      }

      const userId = request.user?.id;
      logger.debug(`jwtPlugin:authenticated: ${userId}`);

      const userRepository = fastify.db.userRepository;
      const user = await userRepository.findOne({
        where: { id: userId },
      });

      if (!user) {
        throw new UnauthorizedError("User not found.");
      }

      // Expose the already-loaded user (carries personId + DB-authoritative
      // role) for downstream hooks (PII masking, self-auth) — avoids a second
      // lookup and a JWT claim.
      request.authUser = user;

      if (user.role === UserRole.ADMIN) {
        logger.debug(
          `Admin user ${userId} authenticated, bypassing further checks.`,
        );
        return;
      }

      const { role, allowSelf } = opt || {};

      logger.debug(
        `authenticate role:${role}, allowSelf:${allowSelf}, userId:${userId}`,
      );

      if (role && role !== user.role) {
        throw new UnauthorizedError("Permission denied");
      }

      if (allowSelf) {
        const requestParamId = (request.params as { id?: string }).id;
        if (String(userId) !== requestParamId) {
          throw new UnauthorizedError("Permission denied");
        }
      }
    };
  });
}

export default fp(jwtPlugin, {
  name: "jwt-auth-plugin",
});
