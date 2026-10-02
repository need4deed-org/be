import { FastifyInstance } from "fastify";

export async function upsertPostReaction(
  fastify: FastifyInstance,
  postId: number,
  personId: number,
  emoji: string,
): Promise<void> {
  await fastify.db.postReactionRepository.upsert(
    { postId, personId, emoji },
    { conflictPaths: ["postId", "personId"] },
  );
}
