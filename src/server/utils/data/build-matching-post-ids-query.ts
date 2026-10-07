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
    const pattern = `%${escapeLikePattern(search)}%`;
    qb.leftJoin("post.author", "author")
      .leftJoin("post.taggedPersons", "taggedPerson")
      .leftJoin("post.linkedOpportunities", "opportunity")
      .leftJoin("post.descendantReplies", "reply")
      .andWhere(
        new Brackets((sub) => {
          sub
            .where("post.text ILIKE :search", { search: pattern })
            .orWhere("reply.text ILIKE :search", { search: pattern })
            .orWhere(personNameIlikeCondition("author"), { search: pattern })
            .orWhere(personNameIlikeCondition("taggedPerson"), {
              search: pattern,
            })
            .orWhere("opportunity.title ILIKE :search", { search: pattern });
        }),
      );
  }

  return qb;
}
