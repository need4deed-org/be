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
import { verifyPassword } from "../../data/utils";
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

  // Direct (non-login) API access: looks up the raw key against active
  // (non-revoked) ApiKey rows and returns the linked service user. The key
  // set is expected to stay small (bot accounts only), so a bcrypt.compare
  // per row is cheap — bcrypt can't be looked up by an indexed hash match.
  async function findUserByApiKey(rawKey: string): Promise<User | null> {
    const activeKeys = await fastify.db.apiKeyRepository.find({
      where: { revokedAt: IsNull() },
      relations: { user: true },
    });

    for (const apiKey of activeKeys) {
      if (await verifyPassword(rawKey, apiKey.keyHash)) {
        fastify.db.apiKeyRepository
          .update(apiKey.id, { lastUsedAt: new Date() })
          .catch((err) =>
            logger.error(err, "Failed to update api key lastUsedAt"),
          );
        return apiKey.user;
      }
    }
    return null;
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
        if (!user.isActive) {
          throw new UnauthenticatedError("Account is not active.");
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

        user = await fastify.db.userRepository.findOne({
          where: { id: userId },
        });

        if (!user) {
          throw new UnauthorizedError("User not found.");
        }
      }

      // Expose the already-loaded user (carries personId + DB-authoritative
      // role) for downstream hooks (PII masking, self-auth) — avoids a second
      // lookup and a JWT claim.
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
}

export default fp(jwtPlugin, {
  name: "jwt-auth-plugin",
});
