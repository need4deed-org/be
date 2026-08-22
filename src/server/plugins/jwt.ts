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

  // Direct (non-login) API access: an O(1) indexed lookup of the raw key's
  // SHA-256 digest against active (non-revoked) ApiKey rows, returning the
  // linked service user. This must stay a cheap single-row lookup (not a
  // linear bcrypt.compare scan) since, unlike the JWT-cookie path, it runs
  // on every request from an unauthenticated caller that merely sends the
  // header — an expensive per-row check here would be a free CPU-exhaustion
  // lever for anyone spraying garbage keys at any protected route.
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
        // isActive is checked here but deliberately not for the JWT-cookie
        // path below: this is a new gate introduced for API keys, not a
        // fix applied unevenly. Changing existing cookie-session behavior
        // (an already-issued 15-min token for a since-deactivated user
        // currently still authenticates until it expires) is out of scope
        // for this change.
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

  // Best-effort caller identification for genuinely public routes that still
  // need to vary behavior for a logged-in privileged caller (be#903: GET
  // /event shows everything to a coordinator, only active events to everyone
  // else). Unlike authenticate(), never throws — a missing/invalid/expired
  // cookie just leaves request.authUser unset, same as an anonymous caller.
  // Doesn't support the API-key path or role/allowSelf options: those only
  // make sense for a route that actually requires auth.
  fastify.decorate("tryAuthenticate", function () {
    return async function (request: FastifyRequest) {
      try {
        await request.jwtVerify();
      } catch {
        return;
      }

      const user = await fastify.db.userRepository.findOne({
        where: { id: request.user?.id },
      });
      if (user) {
        request.authUser = user;
      }
    };
  });
}

export default fp(jwtPlugin, {
  name: "jwt-auth-plugin",
});
