import { FastifyInstance } from "fastify";

// One reaction per person per item — posting a new emoji replaces any
// existing reaction rather than adding a second row (the unique index on
// PostReaction(postId, personId) would reject a plain insert otherwise).
export async function upsertPostReaction(
  fastify: FastifyInstance,
  postId: number,
  personId: number,
  emoji: string,
): Promise<void> {
  const existing = await fastify.db.postReactionRepository.findOne({
    where: { postId, personId },
  });
  if (existing) {
    existing.emoji = emoji;
    await fastify.db.postReactionRepository.save(existing);
  } else {
    await fastify.db.postReactionRepository.save(
      fastify.db.postReactionRepository.create({ postId, personId, emoji }),
    );
  }
}
