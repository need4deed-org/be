import Fastify, { FastifyInstance } from "fastify";

import typeormPlugin from "./plugins/typeorm";
import personRoutes from "./routes/person";
import userRoutes from "./routes/user";
import { RoutePrefix } from "./types";

export const server: FastifyInstance = Fastify({
  logger: {
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
      },
    },
  },
});

server.register(typeormPlugin);
server.register(userRoutes, { prefix: RoutePrefix.USER });
server.register(personRoutes, { prefix: RoutePrefix.PERSON });

export const start = async () => {
  try {
    await server.listen({ port: 5000, host: "0.0.0.0" });
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};
