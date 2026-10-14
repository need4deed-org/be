import { FastifyInstance } from "fastify";
import Agent from "../../../data/entity/opportunity/agent.entity";
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
    .where("pa.post_id IN (:...postIds)", { postIds: posts.map((p) => p.id) })
    .andWhere("agent.unclaimed = false")
    .orderBy("agent.id")
    .getRawMany<{ postId: number; id: number; title: string }>();

  const agentsByPost = new Map<number, Agent[]>();
  for (const row of rows) {
    const postId = Number(row.postId);
    agentsByPost.set(postId, [
      ...(agentsByPost.get(postId) ?? []),
      new Agent({ id: Number(row.id), title: row.title }),
    ]);
  }
  for (const post of posts) {
    post.taggedAgents = agentsByPost.get(post.id) ?? [];
  }
}
