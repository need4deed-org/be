import { FastifyInstance, FastifyPluginOptions } from "fastify";
import fp from "fastify-plugin";
import {
  ACCESS_LIFESPAN_MS,
  accessCookieName,
  cookieOptions,
  REFRESH_LIFESPAN_MS,
  refreshCookieName,
} from "../../config/constants";
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
      errors?: any;
    };
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
        logger.debug(`Attempting to authenticate: ${email}`);

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

        const userPayload = { id: user.id, email: user.email, role: user.role };

        const access = fastify.jwt.sign(
          { ...userPayload, type: "access" },
          { expiresIn: `${ACCESS_LIFESPAN_MS}` },
        );

        if (!access) {
          throw new Error("No token generated.");
        }

        const refresh = fastify.jwt.sign(
          { ...userPayload, type: "refresh" },
          { expiresIn: `${REFRESH_LIFESPAN_MS}` },
        );

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
        logger.error(`Authentication error: ${error.message}`);
        return reply.status(500).send({ message: "Internal server error." });
      }
    },
  );

  fastify.post<{
    Body: {
      refresh?: string;
    };
    Reply: {
      message?: string;
      access?: string;
      errors?: any;
    };
  }>(
    prefixedPath + RoutePrefix.REFRESH,
    {
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
      let id: number;
      let token: string;

      if (request.body?.refresh) {
        token = request.body.refresh;
      } else if (request.cookies && request.cookies[refreshCookieName]) {
        token = request.cookies[refreshCookieName];
      }

      if (!token) {
        return reply
          .status(400)
          .send({ message: "Refresh token is required." });
      }

      try {
        const decoded = (await fastify.jwt.verify(token)) as {
          email: string;
          id: number;
        };
        if (!decoded || !(decoded.id && decoded.email)) {
          return reply.status(400).send({ message: "Invalid refresh token." });
        }

        id = decoded.id;
      } catch (error) {
        logger.error(`JWT verification failed: ${error.message}`);
        return reply.status(400).send({ message: "Invalid refresh token." });
      }

      try {
        const userRepository = fastify.db.userRepository;
        if (!userRepository) {
          throw new Error("User repository is not initialized.");
        }

        const user = await userRepository.findOne({
          where: { id },
        });
        if (!user) {
          return reply.status(404).send({ message: "User not found." });
        }

        if (!user.isActive) {
          return reply.status(403).send({ message: "User is not active." });
        }

        const userPayload = { id: user.id, email: user.email };

        const access = fastify.jwt.sign(userPayload, {
          expiresIn: `${ACCESS_LIFESPAN_MS}`,
        });

        if (!access) {
          throw new Error("No token generated.");
        }

        logger.debug(
          `Generated new access token for user ID: ${id}: ${access}`,
        );

        reply.setCookie(accessCookieName, access, {
          ...cookieOptions,
          expires: new Date(Date.now() + ACCESS_LIFESPAN_MS),
        });

        return reply.status(200).send({ access });
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
    async (_request, reply) => {
      // Logout is open (no auth guard) so a stale/expired session can always
      // clear its cookies. Clear the httpOnly auth cookies on the caller's
      // browser using the same options they were set with (path/sameSite/secure)
      // so the browser actually removes them.
      reply.clearCookie(accessCookieName, cookieOptions);
      reply.clearCookie(refreshCookieName, cookieOptions);

      return reply.status(200).send({ message: "Logout successful." });
    },
  );

  fastify.post<{
    Body: { email: string };
    Reply: ReplyMessage;
  }>(
    prefixedPath + RoutePrefix.REQUEST_RESET,
    {
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

      await fastify.db.userRepository.update(
        { id: user.id },
        { password: await hashPassword(newPassword) },
      );

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

      await fastify.db.userRepository.update(
        { id: authUser.id },
        { password: await hashPassword(newPassword) },
      );

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
