import { FastifyInstance } from "fastify";

// One reaction per person per item — posting a new emoji replaces any
// existing reaction rather than adding a second row. Uses a single atomic
// DB upsert (ON CONFLICT DO UPDATE) rather than find-then-write: two
// concurrent requests from the same person (double-tap, client retry) would
// otherwise both see no existing row and both try to insert, and the second
// would violate the unique (postId, personId) index instead of replacing.
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
