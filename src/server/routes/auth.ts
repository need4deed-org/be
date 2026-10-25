import { FastifyInstance, FastifyPluginOptions, FastifyReply } from "fastify";
import fp from "fastify-plugin";
import { ApiAuthRefreshPost, ApiAuthRefreshResponse } from "need4deed-sdk";
import { BadRequestError } from "../../config";
import {
  ACCESS_LIFESPAN_MS,
  accessCookieName,
  cookieOptions,
  REFRESH_LIFESPAN_MS,
  refreshCookieName,
} from "../../config/constants";
import User from "../../data/entity/user.entity";
import { hashPassword } from "../../data/utils";
import logger from "../../logger";
import { responseSchema } from "../schema";
import { responseErrors } from "../schema/responseErrors";
import {
  changePasswordSchema,
  messageResponseSchema,
  refreshAccessResponseSchema,
  refreshAccessSchema,
  requestResetSchema,
  resetPasswordSchema,
  userLoginResponseSchema,
  userLoginSchema,
} from "../schema/user.schema";
import { ReplyMessage, RoutePrefix } from "../types";
import {
  createRefreshSession,
  revokeRefreshSession,
  revokeUserRefreshSessions,
  rotateRefreshSession,
} from "../utils/data/refresh-session";
import { signAccessToken } from "../utils/data/sign-access-token";
import { signRefreshToken } from "../utils/data/sign-refresh-token";
import { createLoginIpCap, loginRateLimitKey } from "../utils/login-rate-limit";
import {
  getRefreshPayload,
  getRefreshToken,
  refreshRateLimitKey,
} from "../utils/refresh-token";

function clearAuthCookies(reply: FastifyReply) {
  reply.clearCookie(accessCookieName, cookieOptions);
  reply.clearCookie(refreshCookieName, cookieOptions);
}

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
    Reply: {
      message: string;
      data?: { access: string; refresh: string };
      errors?: string[];
    };
  }>(
    prefixedPath + RoutePrefix.LOGIN,
    {
      // Per account: behind the fe proxy all users can share one IP.
      config: {
        rateLimit: {
          max: 10,
          timeWindow: "1 minute",
          hook: "preHandler",
          keyGenerator: loginRateLimitKey,
          onExceeded: () => logger.warn("Login failed: rate-limited-account"),
        },
      },
      preHandler: createLoginIpCap(),
      schema: {
        body: userLoginSchema,
        response: {
          200: userLoginResponseSchema,
          ...responseErrors,
        },
      },
    },
    async (request, reply) => {
      clearAuthCookies(reply);

      const { email, password } = request.body;

      if (!email || !password) {
        logger.warn("Login failed: empty-field");
        return reply.status(400).send({ message: "Bad credentials." });
      }

      try {
        const userRepository = fastify.db.userRepository;
        if (!userRepository) {
          throw new Error("User repository is not initialized.");
        }

        const user = await userRepository.findOne({
          where: { email },
        });
        if (!user) {
          logger.warn("Login failed: unknown-email");
          return reply.status(404).send({ message: "User not found." });
        }

        if (!user.isActive) {
          logger.warn(`Login failed for user ${user.id}: inactive`);
          return reply.status(403).send({ message: "User is not active." });
        }

        if (!(await user.checkPassword(password))) {
          logger.warn(`Login failed for user ${user.id}: wrong-password`);
          return reply.status(401).send({ message: "Bad credentials." });
        }

        const access = signAccessToken(fastify, user);

        if (!access) {
          throw new Error("No token generated.");
        }

        const previous = getRefreshPayload(request);
        if (previous) {
          await revokeRefreshSession(
            fastify.db.refreshSessionRepository.manager,
            user.id,
            previous.sid,
          );
        }
        const session = await createRefreshSession(
          fastify.db.refreshSessionRepository.manager,
          user.id,
        );
        const refresh = signRefreshToken(fastify, user, session);

        if (!refresh) {
          throw new Error("No token generated.");
        }

        reply.setCookie(accessCookieName, access, {
          ...cookieOptions,
          expires: new Date(Date.now() + ACCESS_LIFESPAN_MS),
        });

        reply.setCookie(refreshCookieName, refresh, {
          ...cookieOptions,
          expires: new Date(Date.now() + REFRESH_LIFESPAN_MS),
        });

        return reply.status(200).send({
          message: "Login successful.",
          data: { access, refresh },
        });
      } catch (error) {
        logger.error(`Login failed: server-error: ${error.message}`);
        return reply.status(500).send({ message: "Internal server error." });
      }
    },
  );

  fastify.post<{
    Body: ApiAuthRefreshPost;
    Reply: ApiAuthRefreshResponse | { message: string; errors?: string[] };
  }>(
    prefixedPath + RoutePrefix.REFRESH,
    {
      config: {
        rateLimit: {
          max: 20,
          timeWindow: "1 minute",
          keyGenerator: refreshRateLimitKey,
        },
      },
      schema: {
        body: refreshAccessSchema,
        response: {
          200: refreshAccessResponseSchema,
          ...responseErrors,
        },
      },
    },
    async (request, reply) => {
      // verify if refresh token is provided and valid
      if (!getRefreshToken(request)) {
        throw new BadRequestError("Refresh token is required.");
      }
      const decoded = getRefreshPayload(request);
      if (!decoded) {
        clearAuthCookies(reply);
        throw new BadRequestError("Invalid refresh token.");
      }
      const id = decoded.id;

      const user = await fastify.db.userRepository.findOne({
        where: { id },
      });
      if (!user) {
        clearAuthCookies(reply);
        return reply.status(404).send({ message: "User not found." });
      }

      if (!user.isActive) {
        clearAuthCookies(reply);
        return reply.status(403).send({ message: "User is not active." });
      }

      const rotation = await rotateRefreshSession(
        fastify.db.refreshSessionRepository.manager,
        id,
        decoded,
      );
      if (rotation.kind === "reuse") {
        logger.warn(
          `Refresh token reuse for user ${id}, session ${decoded.sid} revoked`,
        );
      }
      if (rotation.kind === "grace") {
        const secondsSinceRotation = Math.round(
          (Date.now() - rotation.rotatedAt.getTime()) / 1000,
        );
        logger.info(
          `Refresh grace for user ${id}, session ${decoded.sid}, ${secondsSinceRotation}s after rotation`,
        );
      }
      if (rotation.kind === "reuse" || rotation.kind === "invalid") {
        clearAuthCookies(reply);
        throw new BadRequestError("Invalid refresh token.");
      }

      try {
        const access = signAccessToken(fastify, user);

        if (!access) {
          throw new Error("No token generated.");
        }

        const refresh = signRefreshToken(fastify, user, rotation.ids);

        if (!refresh) {
          throw new Error("No token generated.");
        }

        reply.setCookie(accessCookieName, access, {
          ...cookieOptions,
          expires: new Date(Date.now() + ACCESS_LIFESPAN_MS),
        });

        reply.setCookie(refreshCookieName, refresh, {
          ...cookieOptions,
          expires: new Date(Date.now() + REFRESH_LIFESPAN_MS),
        });

        return reply.status(200).send({ access, refresh });
      } catch (error) {
        logger.error(`Authentication error: ${error.message}`);
        return reply.status(500).send({ message: "Internal server error." });
      }
    },
  );

  fastify.post<{ Reply: { message: string } }>(
    prefixedPath + RoutePrefix.LOGOUT,
    {
      schema: {
        response: {
          200: messageResponseSchema,
          ...responseErrors,
        },
      },
    },
    async (request, reply) => {
      clearAuthCookies(reply);

      const refresh = getRefreshPayload(request);
      if (refresh) {
        await revokeRefreshSession(
          fastify.db.refreshSessionRepository.manager,
          refresh.id,
          refresh.sid,
        ).catch((err) => {
          logger.error(
            `Failed to revoke refresh session on logout for user ${refresh.id}: ${err instanceof Error ? err.message : err}`,
          );
        });
      }

      return reply.status(200).send({ message: "Logout successful." });
    },
  );

  fastify.post<{
    Body: { email: string };
    Reply: ReplyMessage;
  }>(
    prefixedPath + RoutePrefix.REQUEST_RESET,
    {
      config: { rateLimit: { max: 3, timeWindow: "5 minutes" } },
      schema: {
        body: requestResetSchema,
        response: responseSchema(""),
      },
    },
    async (request, reply) => {
      const { email } = request.body;

      const user = await fastify.db.userRepository.findOne({
        where: { email },
      });

      if (user?.isActive) {
        fastify.notify.passwordReset(user).catch((err) => {
          logger.error(
            `Failed to send password reset for user ${user.id}: ${err instanceof Error ? err.message : err}`,
          );
        });
      }

      return reply.status(200).send({
        message:
          "If an account with that email exists, a reset link has been sent.",
      });
    },
  );

  fastify.post<{
    Body: { token: string; newPassword: string };
    Reply: ReplyMessage;
  }>(
    prefixedPath + RoutePrefix.RESET_PASSWORD,
    {
      config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
      schema: {
        body: resetPasswordSchema,
        response: responseSchema(""),
      },
    },
    async (request, reply) => {
      const { token, newPassword } = request.body;
      const TOKEN_ERROR_MESSAGE = "Invalid reset token.";

      let payload: { id: number; email: string; type?: string };
      try {
        payload = await fastify.jwt.verify(token);
      } catch {
        return reply.status(400).send({ message: TOKEN_ERROR_MESSAGE });
      }

      if (payload.type !== "reset") {
        return reply.status(400).send({ message: TOKEN_ERROR_MESSAGE });
      }

      const user = await fastify.db.userRepository.findOne({
        where: { id: payload.id },
      });
      if (!user) {
        return reply.status(400).send({ message: TOKEN_ERROR_MESSAGE });
      }

      const hashed = await hashPassword(newPassword);
      await fastify.db.userRepository.manager.transaction(async (tx) => {
        await tx.update(User, { id: user.id }, { password: hashed });
        await revokeUserRefreshSessions(tx, user.id);
      });
      logger.info(`Password set for user ${user.id} via reset-password`);

      return reply.status(200).send({
        message: "Password has been reset.",
      });
    },
  );

  fastify.post<{
    Body: { password: string; newPassword: string };
    Reply: ReplyMessage;
  }>(
    prefixedPath + RoutePrefix.CHANGE_PASSWORD,
    {
      config: { rateLimit: { max: 20, timeWindow: "1 minute" } },
      onRequest: [fastify.authenticate()],
      schema: {
        body: changePasswordSchema,
        response: responseSchema(""),
      },
    },
    async (request, reply) => {
      const { password, newPassword } = request.body;
      const authUser = request.authUser!;

      if (!(await authUser.checkPassword(password))) {
        return reply
          .status(400)
          .send({ message: "Current password is incorrect." });
      }

      const hashed = await hashPassword(newPassword);
      const refresh = getRefreshPayload(request);
      await fastify.db.userRepository.manager.transaction(async (tx) => {
        await tx.update(User, { id: authUser.id }, { password: hashed });
        await revokeUserRefreshSessions(
          tx,
          authUser.id,
          refresh?.id === authUser.id ? refresh.sid : undefined,
        );
      });
      logger.info(`Password set for user ${authUser.id} via change-password`);

      return reply.status(200).send({
        message: "Password has been changed.",
      });
    },
  );
}

export default fp(authRoutes, {
  name: "auth-routes",
  dependencies: ["typeorm-plugin"],
});
