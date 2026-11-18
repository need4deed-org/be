import { FastifyInstance } from "fastify";
import { In, SelectQueryBuilder } from "typeorm";
import Post from "../../../data/entity/post.entity";

export function buildPostQuery(
  fastify: FastifyInstance,
): SelectQueryBuilder<Post> {
  return fastify.db.postRepository
    .createQueryBuilder("post")
    .leftJoinAndSelect("post.author", "author")
    .loadRelationCountAndMap("post.replyCount", "post.descendantReplies");
}

export async function attachPostTags(
  fastify: FastifyInstance,
  posts: Post[],
): Promise<void> {
  if (!posts.length) {
    return;
  }
  const tagged = await fastify.db.postRepository.find({
    where: { id: In(posts.map(({ id }) => id)) },
    relations: ["taggedPersons", "linkedOpportunities"],
    relationLoadStrategy: "query",
  });
  const byId = new Map(tagged.map((post) => [post.id, post]));
  for (const post of posts) {
    post.taggedPersons = byId.get(post.id)?.taggedPersons ?? [];
    post.linkedOpportunities = byId.get(post.id)?.linkedOpportunities ?? [];
  }
}
