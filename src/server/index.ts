import Fastify, { FastifyInstance } from "fastify";

import jwtPlugin from "./plugins/jwt";
import typeormPlugin from "./plugins/typeorm";
import authRoutes from "./routes/auth";
import personRoutes from "./routes/person";
import userRoutes from "./routes/user";
import { RoutePrefix } from "./types";
import { generateRandomString } from "./utils";

export const server: FastifyInstance = Fastify({
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
    server.register(typeormPlugin);
    server.register(jwtPlugin, {
      secret: process.env.JWT_SECRET || generateRandomString(64),
    });
    server.register(authRoutes, { prefix: RoutePrefix.AUTH });
    server.register(userRoutes, { prefix: RoutePrefix.USER });
    server.register(personRoutes, { prefix: RoutePrefix.PERSON });

    await server.ready();

    console.log("DEBUG:server.authenticate:", typeof server.authenticate);
    await server.listen({ port: 5000, host: "0.0.0.0" });
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};
