import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { UserRole } from "need4deed-sdk";

export default async function agentRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) {
  await fastify.addHook(
    "onRequest",
    fastify.authenticate({ role: UserRole.COORDINATOR }),
  );

  fastify.get("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const now = new Date().toISOString();
    return reply.status(200).send({
      message: "Agent fetched successfully",
      data: {
        id: Number(id),
        name: "Hanger 1-3",
        type: "rac",
        createdAt: now,
        statusEngagement: "new",
        volunteerSearch: "not_needed",
        trustLevel: "unknown",
      },
      count: 1,
    });
  });
}
