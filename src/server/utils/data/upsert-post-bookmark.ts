import { FastifyInstance } from "fastify";

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
