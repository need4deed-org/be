import { FastifyInstance } from "fastify";
import { SelectQueryBuilder } from "typeorm";
import Post from "../../../data/entity/post.entity";

export function buildPostQuery(
  fastify: FastifyInstance,
): SelectQueryBuilder<Post> {
  return fastify.db.postRepository
    .createQueryBuilder("post")
    .leftJoinAndSelect("post.author", "author")
    .leftJoinAndSelect("post.taggedPersons", "taggedPerson")
    .leftJoin("post.taggedAgents", "taggedAgent")
    .addSelect(["taggedAgent.id", "taggedAgent.title", "taggedAgent.unclaimed"])
    .leftJoinAndSelect("post.linkedOpportunities", "opportunity")
    .loadRelationCountAndMap("post.replyCount", "post.descendantReplies");
}
