import { FastifyInstance } from "fastify";
import { FindOptionsWhere } from "typeorm";
import { NotFoundError } from "../../../config/error/fastify";
import Post from "../../../data/entity/post.entity";
import { getPostReplyWhere, getRootPostWhere } from "./get-post-where";

async function findPostOrThrow(
  fastify: FastifyInstance,
  where: FindOptionsWhere<Post>,
  notFoundMessage: string,
): Promise<Post> {
  const post = await fastify.db.postRepository.findOne({ where });
  if (!post) {
    throw new NotFoundError(notFoundMessage);
  }
  return post;
}

export function getRootPostOrThrow(
  fastify: FastifyInstance,
  id: number,
): Promise<Post> {
  return findPostOrThrow(
    fastify,
    getRootPostWhere(id),
    `Post ${id} not found.`,
  );
}

export function getPostReplyOrThrow(
  fastify: FastifyInstance,
  id: number,
): Promise<Post> {
  return findPostOrThrow(
    fastify,
    getPostReplyWhere(id),
    `Reply ${id} not found.`,
  );
}
