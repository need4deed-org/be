import { FastifyInstance } from "fastify";

export async function deletePostBookmark(
  fastify: FastifyInstance,
  postId: number,
  personId: number,
): Promise<void> {
  await fastify.db.postBookmarkRepository.delete({ postId, personId });
}
