import { FastifyInstance } from "fastify";
import { Brackets, SelectQueryBuilder } from "typeorm";
import Post from "../../../data/entity/post.entity";
import { QuerystringPostList } from "../../types";
import {
  escapeLikePattern,
  personNameIlikeCondition,
} from "./person-name-ilike";

// Root posts only, optionally filtered by author id and/or a free-text
// search across the post's own text, its replies' text, the author's name,
// tagged persons' names, and linked opportunity titles (the two filters
// combine with AND when both are given). Deliberately leftJoin (not
// leftJoinAndSelect) — this query is only ever used to select post ids
// (see GET /post), never to hydrate full rows; buildPostQuery handles
// hydration separately once the page of ids is already fixed.
//
// The search joins are only added when a search term is actually present —
// taggedPersons/linkedOpportunities/replies are all to-many relations, so
// joining them unconditionally would force every non-search feed request to
// pay for a 4-way join it doesn't need, since a bare `post` row is already
// unique with no join at all. authorId needs no join — it's a plain column
// on `post`.
//
// Callers that paginate on top of this (LIMIT/OFFSET) must GROUP BY
// post.id whenever `search` is set, to collapse the to-many-join fan-out
// before limiting — otherwise a post with several tags/opportunities/
// replies could get split across pages or duplicated. Callers that just
// need a total count (no LIMIT/OFFSET) don't need GROUP BY — use
// COUNT(DISTINCT post.id) instead, which is correct with or without the
// joins.
export function buildMatchingPostIdsQuery(
  fastify: FastifyInstance,
  { search, authorId }: Pick<QuerystringPostList, "search" | "authorId">,
): SelectQueryBuilder<Post> {
  const qb = fastify.db.postRepository
    .createQueryBuilder("post")
    .where("post.parentId IS NULL");

  // authorId !== undefined, not truthiness: 0 is never a real id, but a
  // falsy check would silently drop the filter for it (see post.routes.ts).
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
