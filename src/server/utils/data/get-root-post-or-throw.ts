import { FastifyInstance } from "fastify";
import { NotFoundError } from "../../../config/error/fastify";
import Post from "../../../data/entity/post.entity";
import { getRootPostWhere } from "./get-post-where";

// Shared by every handler that only needs to confirm a root post exists
// (no extra relations) before doing something else — PATCH /:id loads
// author/taggedPersons/linkedOpportunities too, so it fetches separately.
export async function getRootPostOrThrow(
  fastify: FastifyInstance,
  id: number,
): Promise<Post> {
  const post = await fastify.db.postRepository.findOne({
    where: getRootPostWhere(id),
  });
  if (!post) {
    throw new NotFoundError(`Post ${id} not found.`);
  }
  return post;
}
