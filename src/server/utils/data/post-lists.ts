import { FastifyInstance } from "fastify";
import Agent from "../../../data/entity/opportunity/agent.entity";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import Person from "../../../data/entity/person.entity";
import Post from "../../../data/entity/post.entity";

const AGENT_TOKEN = /<@agent:(\d+)>/g;
const MAX_INT4 = 2147483647;

export function getTaggedAgentIds(text: string): number[] {
  return [
    ...new Set(
      [...text.matchAll(AGENT_TOKEN)]
        .map((m) => Number(m[1]))
        .filter((id) => id <= MAX_INT4),
    ),
  ];
}

function groupByPost<R extends { postId: number }, T>(
  rows: R[],
  toItem: (row: R) => T,
): Map<number, T[]> {
  const byPost = new Map<number, T[]>();
  for (const row of rows) {
    const postId = Number(row.postId);
    byPost.set(postId, [...(byPost.get(postId) ?? []), toItem(row)]);
  }
  return byPost;
}

const postIdsOf = (posts: Post[]) => ({ postIds: posts.map(({ id }) => id) });

export async function attachTaggedAgents(
  fastify: FastifyInstance,
  posts: Post[],
): Promise<void> {
  if (!posts.length) {
    return;
  }
  const rows = await fastify.db.agentRepository
    .createQueryBuilder("agent")
    .innerJoin("post_agent", "pa", "pa.agent_id = agent.id")
    .select("pa.post_id", "postId")
    .addSelect("agent.id", "id")
    .addSelect("agent.title", "title")
    .where("pa.post_id IN (:...postIds)", postIdsOf(posts))
    .andWhere("agent.unclaimed = false")
    .orderBy("agent.id")
    .getRawMany<{ postId: number; id: number; title: string }>();

  const byPost = groupByPost(
    rows,
    (row) => new Agent({ id: Number(row.id), title: row.title }),
  );
  for (const post of posts) {
    post.taggedAgents = byPost.get(post.id) ?? [];
  }
}

export async function attachTaggedPersons(
  fastify: FastifyInstance,
  posts: Post[],
): Promise<void> {
  if (!posts.length) {
    return;
  }
  const rows = await fastify.db.personRepository
    .createQueryBuilder("person")
    .innerJoin("post_person", "pp", "pp.person_id = person.id")
    .select("pp.post_id", "postId")
    .addSelect("person.id", "id")
    .addSelect("person.firstName", "firstName")
    .addSelect("person.middleName", "middleName")
    .addSelect("person.lastName", "lastName")
    .addSelect("person.avatarUrl", "avatarUrl")
    .where("pp.post_id IN (:...postIds)", postIdsOf(posts))
    .orderBy("person.id")
    .getRawMany<{
      postId: number;
      id: number;
      firstName: string;
      middleName: string | null;
      lastName: string;
      avatarUrl: string | null;
    }>();

  const byPost = groupByPost(
    rows,
    ({ postId: _postId, id, ...person }) =>
      new Person({ id: Number(id), ...person }),
  );
  for (const post of posts) {
    post.taggedPersons = byPost.get(post.id) ?? [];
  }
}

export async function attachLinkedOpportunities(
  fastify: FastifyInstance,
  posts: Post[],
): Promise<void> {
  if (!posts.length) {
    return;
  }
  const rows = await fastify.db.opportunityRepository
    .createQueryBuilder("opportunity")
    .innerJoin("post_opportunity", "po", "po.opportunity_id = opportunity.id")
    .select("po.post_id", "postId")
    .addSelect("opportunity.id", "id")
    .addSelect("opportunity.title", "title")
    .addSelect("opportunity.info", "info")
    .addSelect("opportunity.originalLanguageId", "originalLanguageId")
    .where("po.post_id IN (:...postIds)", postIdsOf(posts))
    .orderBy("opportunity.id")
    .getRawMany<{
      postId: number;
      id: number;
      title: string;
      info: string | null;
      originalLanguageId: number | null;
    }>();

  const byPost = groupByPost(
    rows,
    ({ postId: _postId, id, ...opportunity }) =>
      new Opportunity({ id: Number(id), ...opportunity }),
  );
  for (const post of posts) {
    post.linkedOpportunities = byPost.get(post.id) ?? [];
  }
}
