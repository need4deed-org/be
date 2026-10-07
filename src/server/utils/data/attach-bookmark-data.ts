import { FastifyInstance } from "fastify";
import { In } from "typeorm";
import Post from "../../../data/entity/post.entity";

export async function attachBookmarkData(
  fastify: FastifyInstance,
  posts: Post[],
  requestPersonId: number | undefined,
): Promise<void> {
  if (posts.length === 0) {
    return;
  }

  const bookmarks = requestPersonId
    ? await fastify.db.postBookmarkRepository.find({
        select: ["postId"],
        where: {
          postId: In(posts.map((post) => post.id)),
          personId: requestPersonId,
        },
      })
    : [];
  const bookmarkedPostIds = new Set(bookmarks.map((b) => b.postId));

  for (const post of posts) {
    post.bookmarked = bookmarkedPostIds.has(post.id);
  }
}
