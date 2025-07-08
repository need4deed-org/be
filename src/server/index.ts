import cookie from "@fastify/cookie";
import Fastify, { FastifyInstance } from "fastify";
import fastifyMailer from "fastify-mailer";

import { defaultFrom } from "../config/constants";
import { getMailerConfigForSES, getSesClient } from "../services";
import cors, { corsOptions } from "./plugins/cors";
import emailPlugin from "./plugins/email";
import jwtPlugin from "./plugins/jwt";
import typeormPlugin from "./plugins/typeorm";
import authRoutes from "./routes/auth";
import healthRoutes from "./routes/health";
import personRoutes from "./routes/person";
import userRoutes from "./routes/user";
import { RoutePrefix } from "./types";
import { generateRandomString } from "./utils";

export const fastify: FastifyInstance = Fastify({
  logger: {
    level: process.env.NODE_ENV === "development" ? "debug" : undefined,
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
      },
    },
  },
});

export const start = async () => {
  try {
    fastify.register(typeormPlugin);
    fastify.register(cookie);
    fastify.register(jwtPlugin, {
      secret: process.env.JWT_SECRET || generateRandomString(64),
    });
    fastify.register(cors, corsOptions);
    fastify.register(fastifyMailer, getMailerConfigForSES(getSesClient()));
    fastify.register(emailPlugin, { provider: "ses", defaultFrom });
    fastify.register(healthRoutes, { prefix: RoutePrefix.HEALTH_CHECK });
    fastify.register(authRoutes, { prefix: RoutePrefix.AUTH });
    fastify.register(userRoutes, { prefix: RoutePrefix.USER });
    fastify.register(personRoutes, { prefix: RoutePrefix.PERSON });

    await fastify.ready();

    await fastify.listen({ port: 5000, host: "0.0.0.0" });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};
