import { FastifyInstance } from "fastify";
import { In } from "typeorm";
import Post from "../../../data/entity/post.entity";

// Populates the virtual bookmarked field on a batch of (root) posts with a
// single batched query — not N+1 per row. Posts only, not replies. Every
// route that returns a post must call this before mapping through dtoPost,
// or the response silently reports bookmarked: false.
export async function attachBookmarkData(
  fastify: FastifyInstance,
  posts: Post[],
  requestPersonId: number | undefined,
): Promise<void> {
  if (posts.length === 0) {
    return;
  }

  const bookmarkedPostIds = requestPersonId
    ? new Set(
        (
          await fastify.db.postBookmarkRepository.find({
            where: {
              postId: In(posts.map((post) => post.id)),
              personId: requestPersonId,
            },
          })
        ).map((b) => b.postId),
      )
    : new Set<number>();

  for (const post of posts) {
    post.bookmarked = bookmarkedPostIds.has(post.id);
  }
}
