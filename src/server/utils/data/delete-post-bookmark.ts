import { FastifyInstance } from "fastify";

// Idempotent — un-bookmarking an already-absent bookmark is a no-op
// success. No existence check on postId first: a delete-by-criteria
// already matches zero rows whether the post doesn't exist or was never
// bookmarked, both a no-op 204 either way — mirrors deletePostReaction.
export async function deletePostBookmark(
  fastify: FastifyInstance,
  postId: number,
  personId: number,
): Promise<void> {
  await fastify.db.postBookmarkRepository.delete({ postId, personId });
}
