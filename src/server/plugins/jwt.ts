import fastifyJwt from "@fastify/jwt";
import { FastifyInstance, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import { UserRole } from "need4deed-sdk";
import { IsNull } from "typeorm";
import { UnauthenticatedError, UnauthorizedError } from "../../config";
import {
  accessCookieName,
  apiKeyHeaderName,
  cookieOptions,
} from "../../config/constants";
import User from "../../data/entity/user.entity";
import { sha256Hex } from "../../data/utils";
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

  async function findUserByApiKey(rawKey: string): Promise<User | null> {
    const apiKey = await fastify.db.apiKeyRepository.findOne({
      where: { keyHash: sha256Hex(rawKey), revokedAt: IsNull() },
      relations: { user: true },
    });

    if (!apiKey) {
      return null;
    }

    fastify.db.apiKeyRepository
      .update(apiKey.id, { lastUsedAt: new Date() })
      .catch((err) => logger.error(err, "Failed to update api key lastUsedAt"));
    return apiKey.user;
  }

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

      const apiKeyHeader = request.headers[apiKeyHeaderName];
      const rawApiKey = Array.isArray(apiKeyHeader)
        ? apiKeyHeader[0]
        : apiKeyHeader;

      let user: User | null;

      if (rawApiKey) {
        user = await findUserByApiKey(rawApiKey);
        if (!user) {
          throw new UnauthenticatedError("Invalid API key.");
        }
        logger.debug(`jwtPlugin:authenticated via api key: ${user.id}`);
      } else {
        try {
          await request.jwtVerify();
        } catch {
          throw new UnauthenticatedError("Authorization failed.");
        }

        const userId = request.user?.id;
        logger.debug(`jwtPlugin:authenticated: ${userId}`);

        if ((request.user as { type?: string })?.type !== "access") {
          throw new UnauthenticatedError("Authorization failed.");
        }
        if (!userId) {
          throw new UnauthenticatedError("Authorization failed.");
        }

        user = await fastify.db.userRepository.findOne({
          where: { id: userId },
        });

        if (!user) {
          throw new UnauthorizedError("User not found.");
        }
      }

      if (!user.isActive) {
        throw new UnauthenticatedError("Account is not active.");
      }

      request.authUser = user;

      if (user.role === UserRole.ADMIN) {
        logger.debug(
          `Admin user ${user.id} authenticated, bypassing further checks.`,
        );
        return;
      }

      const { role, allowSelf } = opt || {};

      logger.debug(
        `authenticate role:${role}, allowSelf:${allowSelf}, userId:${user.id}`,
      );

      if (role && role !== user.role) {
        throw new UnauthorizedError("Permission denied");
      }

      if (allowSelf) {
        const requestParamId = (request.params as { id?: string }).id;
        if (String(user.id) !== requestParamId) {
          throw new UnauthorizedError("Permission denied");
        }
      }
    };
  });

  fastify.decorate("tryAuthenticate", function () {
    return async function (request: FastifyRequest) {
      try {
        await request.jwtVerify();
        if ((request.user as { type?: string })?.type !== "access") {
          return;
        }

        const user = await fastify.db.userRepository.findOne({
          where: { id: request.user?.id },
        });
        if (user?.isActive) {
          request.authUser = user;
        }
      } catch {
        return;
      }
    };
  });
}

export default fp(jwtPlugin, {
  name: "jwt-auth-plugin",
});
