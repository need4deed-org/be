import { FastifyInstance } from "fastify";
import { Brackets, SelectQueryBuilder } from "typeorm";
import Post from "../../../data/entity/post.entity";

// Root posts only, optionally filtered by a free-text search across the
// post's own text, its replies' text, the author's name, tagged persons'
// names, and linked opportunity titles. Deliberately leftJoin (not
// leftJoinAndSelect) — this query is only ever used to select post ids for
// pagination (see GET /post), never to hydrate full rows; buildPostQuery
// handles hydration separately once the page of ids is already fixed.
//
// Why this matters: taggedPersons/linkedOpportunities/replies are all
// to-many relations. Joining them and then applying LIMIT/OFFSET directly
// would paginate over the fanned-out flat rows, not distinct posts — a post
// with several tags/opportunities could get split across pages or
// duplicated. Callers must GROUP BY post.id (+ any ORDER BY column) before
// paginating on top of this query.
export function buildMatchingPostIdsQuery(
  fastify: FastifyInstance,
  search: string | undefined,
): SelectQueryBuilder<Post> {
  const qb = fastify.db.postRepository
    .createQueryBuilder("post")
    .leftJoin("post.author", "author")
    .leftJoin("post.taggedPersons", "taggedPerson")
    .leftJoin("post.linkedOpportunities", "opportunity")
    .leftJoin("post.descendantReplies", "reply")
    .where("post.parentId IS NULL");

  if (search) {
    const pattern = `%${search}%`;
    // Person.name (what's actually displayed/searched-for) is a computed
    // getter — firstName/middleName/lastName joined with a space, skipping
    // any that are null — not a column. CONCAT_WS mirrors that exactly, so
    // searching a full display name like "Jane Doe" matches, not just a
    // single name part.
    const personNameMatch = (alias: string) =>
      `CONCAT_WS(' ', ${alias}.firstName, ${alias}.middleName, ${alias}.lastName) ILIKE :search`;
    qb.andWhere(
      new Brackets((sub) => {
        sub
          .where("post.text ILIKE :search", { search: pattern })
          .orWhere("reply.text ILIKE :search", { search: pattern })
          .orWhere(personNameMatch("author"), { search: pattern })
          .orWhere(personNameMatch("taggedPerson"), { search: pattern })
          .orWhere("opportunity.title ILIKE :search", { search: pattern });
      }),
    );
  }

  return qb;
}
