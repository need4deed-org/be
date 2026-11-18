import { FastifyInstance } from "fastify";
import { Brackets, SelectQueryBuilder } from "typeorm";
import Post from "../../../data/entity/post.entity";
import { QuerystringPostList } from "../../types";
import {
  escapeLikePattern,
  personNameIlikeCondition,
} from "./person-name-ilike";

export function buildMatchingPostIdsQuery(
  fastify: FastifyInstance,
  { search, authorId }: Pick<QuerystringPostList, "search" | "authorId">,
): SelectQueryBuilder<Post> {
  const qb = fastify.db.postRepository
    .createQueryBuilder("post")
    .where("post.parentId IS NULL");

  if (authorId !== undefined) {
    qb.andWhere("post.authorId = :authorId", { authorId });
  }

  if (search) {
    const replyMatch = qb
      .subQuery()
      .select("1")
      .from(Post, "reply")
      .where("reply.rootId = post.id")
      .andWhere("reply.text ILIKE :search")
      .getQuery();
    const taggedPersonMatch = qb
      .subQuery()
      .select("1")
      .from(Post, "taggedPost")
      .innerJoin("taggedPost.taggedPersons", "taggedPerson")
      .where("taggedPost.id = post.id")
      .andWhere(personNameIlikeCondition("taggedPerson"))
      .getQuery();
    const opportunityMatch = qb
      .subQuery()
      .select("1")
      .from(Post, "linkedPost")
      .innerJoin("linkedPost.linkedOpportunities", "opportunity")
      .where("linkedPost.id = post.id")
      .andWhere("opportunity.title ILIKE :search")
      .getQuery();
    qb.leftJoin("post.author", "author")
      .andWhere(
        new Brackets((sub) => {
          sub
            .where("post.text ILIKE :search")
            .orWhere(`EXISTS ${replyMatch}`)
            .orWhere(personNameIlikeCondition("author"))
            .orWhere(`EXISTS ${taggedPersonMatch}`)
            .orWhere(`EXISTS ${opportunityMatch}`);
        }),
      )
      .setParameter("search", `%${escapeLikePattern(search)}%`);
  }

  return qb;
}
