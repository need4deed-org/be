import { FastifyInstance } from "fastify";

// Idempotent — deleting an already-absent reaction is a no-op success,
// matching typical un-react/un-like UX. No existence check on postId first:
// a delete-by-criteria already matches zero rows whether the post/reply
// doesn't exist or the person just never reacted, and both cases are a
// no-op 204 either way.
export async function deletePostReaction(
  fastify: FastifyInstance,
  postId: number,
  personId: number,
): Promise<void> {
  await fastify.db.postReactionRepository.delete({ postId, personId });
}
