import { FastifyInstance } from "fastify";

export async function deletePostReaction(
  fastify: FastifyInstance,
  postId: number,
  personId: number,
): Promise<void> {
  await fastify.db.postReactionRepository.delete({ postId, personId });
}
