import { FastifyInstance } from "fastify";
import { SelectQueryBuilder } from "typeorm";
import Post from "../../../data/entity/post.entity";

export function buildPostQuery(
  fastify: FastifyInstance,
): SelectQueryBuilder<Post> {
  return fastify.db.postRepository
    .createQueryBuilder("post")
    .leftJoinAndSelect("post.author", "author")
    .loadRelationCountAndMap("post.replyCount", "post.descendantReplies");
}
