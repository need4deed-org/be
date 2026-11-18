import { FastifyInstance } from "fastify";
import { ObjectLiteral, SelectQueryBuilder } from "typeorm";
import Post from "../../../data/entity/post.entity";

async function loadByPost<E extends ObjectLiteral & { id: number }>(
  qb: SelectQueryBuilder<E>,
  linkTable: string,
  linkColumn: string,
  posts: Post[],
): Promise<Map<number, E[]>> {
  const byPost = new Map<number, E[]>();
  if (!posts.length) {
    return byPost;
  }
  const { alias } = qb;
  const { entities, raw } = await qb
    .innerJoin(linkTable, "link", `link.${linkColumn} = ${alias}.id`)
    .addSelect("link.post_id", "postId")
    .andWhere("link.post_id IN (:...postIds)", {
      postIds: posts.map(({ id }) => id),
    })
    .getRawAndEntities<Record<string, unknown>>();
  const byId = new Map(entities.map((entity) => [entity.id, entity]));
  for (const row of raw) {
    const entity = byId.get(Number(row[`${alias}_id`]));
    if (!entity) {
      throw new Error(`${linkTable} row without a loaded ${alias}`);
    }
    const postId = Number(row.postId);
    const list = byPost.get(postId);
    if (list) {
      list.push(entity);
    } else {
      byPost.set(postId, [entity]);
    }
  }
  return byPost;
}

export async function attachTaggedAgents(
  fastify: FastifyInstance,
  posts: Post[],
): Promise<void> {
  const agents = await loadByPost(
    fastify.db.agentRepository
      .createQueryBuilder("agent")
      .select(["agent.id", "agent.title"])
      .where("agent.unclaimed = false"),
    "post_agent",
    "agent_id",
    posts,
  );
  for (const post of posts) {
    post.taggedAgents = agents.get(post.id) ?? [];
  }
}

export async function attachPostLists(
  fastify: FastifyInstance,
  posts: Post[],
): Promise<void> {
  const persons = await loadByPost(
    fastify.db.personRepository
      .createQueryBuilder("person")
      .select([
        "person.id",
        "person.firstName",
        "person.middleName",
        "person.lastName",
        "person.avatarUrl",
      ]),
    "post_person",
    "person_id",
    posts,
  );
  const opportunities = await loadByPost(
    fastify.db.opportunityRepository
      .createQueryBuilder("opportunity")
      .select([
        "opportunity.id",
        "opportunity.title",
        "opportunity.info",
        "opportunity.originalLanguageId",
      ]),
    "post_opportunity",
    "opportunity_id",
    posts,
  );
  for (const post of posts) {
    post.taggedPersons = persons.get(post.id) ?? [];
    post.linkedOpportunities = opportunities.get(post.id) ?? [];
  }
  await attachTaggedAgents(fastify, posts);
}
