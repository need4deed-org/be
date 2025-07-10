import { FastifyInstance, FastifyPluginOptions } from "fastify";
import fp from "fastify-plugin";
import {
  ACCESS_LIFESPAN_MS,
  accessCookieName,
  cookieOptions,
  REFRESH_LIFESPAN_MS,
  refreshCookieName,
} from "../../config/constants";
import { responseErrors } from "../../data/schema/responseErrors";
import {
  refreshAccessResponseSchema,
  refreshAccessSchema,
  userLoginResponseSchema,
  userLoginSchema,
} from "../../data/schema/user.schema";
import { RoutePrefix } from "../types";

const accessCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "none" as boolean | "none" | "lax" | "strict",
};

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

        const userPayload = { id: user.id, email: user.email };

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
        fastify.log.error(`Authentication error: ${error.message}`);
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
        fastify.log.error(`JWT verification failed: ${error.message}`);
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

        fastify.log.debug(
          `Generated new access token for user ID: ${id}: ${access}`,
        );

        reply.setCookie(accessCookieName, access, {
          ...cookieOptions,
          expires: new Date(Date.now() + ACCESS_LIFESPAN_MS),
        });

        return reply.status(200).send({ access });
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
