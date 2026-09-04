import { FastifyInstance } from "fastify";

// Atomic DB upsert (ON CONFLICT DO UPDATE) rather than find-then-write —
// mirrors upsertPostReaction's reasoning: bookmarking twice in quick
// succession (double-tap, client retry) must not race into a unique
// (postId, personId) violation.
export async function upsertPostBookmark(
  fastify: FastifyInstance,
  postId: number,
  personId: number,
): Promise<void> {
  await fastify.db.postBookmarkRepository.upsert(
    { postId, personId },
    { conflictPaths: ["postId", "personId"] },
  );
}
