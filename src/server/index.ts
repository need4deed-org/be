import Fastify, { FastifyInstance } from "fastify";
import avatarRoutes from "./routes/avatars";
import userRoutes from "./routes/users";

export const server: FastifyInstance = Fastify({
  logger: true,
});

server.register(userRoutes, { prefix: "/users" });
server.register(avatarRoutes, { prefix: "/avatars" });

export const start = async () => {
  try {
    await server.listen({ port: 5000, host: "0.0.0.0" });
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};
