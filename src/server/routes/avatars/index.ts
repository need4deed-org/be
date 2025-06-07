import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { AppDataSource } from "../../../data/data-source";
import { Avatar } from "../../../data/entity/Avatar";

export default async function avatarRoutes(
  fastify: FastifyInstance,
  options: FastifyPluginOptions,
) {
  fastify.get("/", async (request, reply) => {
    const avatars = await AppDataSource.manager.find(Avatar);
    return { message: "List of avatars", data: avatars };
  });

  fastify.get("/:id", async (request, reply) => {
    const avatarId = (request.params as { id: string }).id;
    const avatar = await AppDataSource.manager.findOne(Avatar, {
      where: { id: parseInt(avatarId) },
    });
    return {
      message: avatar
        ? `Details for avatar ${avatarId}`
        : `Avatar ${avatarId} not found`,
      data: avatar,
    };
  });
}
