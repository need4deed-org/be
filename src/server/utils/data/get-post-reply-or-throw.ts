import { FastifyInstance } from "fastify";
import { NotFoundError } from "../../../config/error/fastify";
import Post from "../../../data/entity/post.entity";
import { getPostReplyWhere } from "./get-post-where";

// Mirrors getRootPostOrThrow — shared by every handler that only needs to
// confirm a reply exists (no extra relations) before doing something else.
// PATCH /reply/:id loads the author relation too, so it fetches separately.
export async function getPostReplyOrThrow(
  fastify: FastifyInstance,
  id: number,
): Promise<Post> {
  const postReply = await fastify.db.postRepository.findOne({
    where: getPostReplyWhere(id),
  });
  if (!postReply) {
    throw new NotFoundError(`Reply ${id} not found.`);
  }
  return postReply;
}
