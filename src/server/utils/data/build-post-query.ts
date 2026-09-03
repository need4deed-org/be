import { FastifyInstance } from "fastify";
import { SelectQueryBuilder } from "typeorm";
import Post from "../../../data/entity/post.entity";

// Shared by GET /post (the feed) and any handler that returns a single
// post's full ApiPostGet shape (e.g. PATCH /post/:id) — both need the same
// relations plus the loadRelationCountAndMap'd replyCount, so a post
// fetched without going through this builder silently reports
// replyCount: 0 regardless of how many replies it actually has.
export function buildPostQuery(
  fastify: FastifyInstance,
): SelectQueryBuilder<Post> {
  return fastify.db.postRepository
    .createQueryBuilder("post")
    .leftJoinAndSelect("post.author", "author")
    .leftJoinAndSelect("post.taggedPersons", "taggedPerson")
    .leftJoinAndSelect("post.linkedOpportunities", "opportunity")
    .loadRelationCountAndMap("post.replyCount", "post.descendantReplies");
}
