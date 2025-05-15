import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { AppDataSource } from "../../../data/data-source";
import { User } from "../../../data/entity/User";

export default async function userRoutes(
  fastify: FastifyInstance,
  options: FastifyPluginOptions,
) {
  fastify.get("/", async (request, reply) => {
    const users = await AppDataSource.manager.find(User);
    return { message: "List of users", data: users };
  });

  fastify.get("/:id", async (request, reply) => {
    const userId = (request.params as { id: string }).id;
    const user = await AppDataSource.manager.findOne(User, {
      where: { id: parseInt(userId) },
    });
    return {
      message: user ? `Details for user ${userId}` : `User ${userId} not found`,
      data: user,
    };
  });
}
