import { FastifyInstance } from "fastify";
import { In } from "typeorm";
import Post from "../../../data/entity/post.entity";

const AGENT_TOKEN = /<@agent:(\d+)>/g;

export function getTaggedAgentIds(text: string): number[] {
  return [...new Set([...text.matchAll(AGENT_TOKEN)].map((m) => Number(m[1])))];
}

export async function attachTaggedAgents(
  fastify: FastifyInstance,
  posts: Post[],
): Promise<void> {
  const idsByPost = new Map(
    posts.map((post) => [post.id, getTaggedAgentIds(post.text ?? "")]),
  );
  const allIds = [...new Set([...idsByPost.values()].flat())];
  const agents = allIds.length
    ? await fastify.db.agentRepository.find({
        select: { id: true, title: true },
        where: { id: In(allIds) },
      })
    : [];
  const titleById = new Map(agents.map((a) => [a.id, a.title]));

  for (const post of posts) {
    post.taggedAgents = (idsByPost.get(post.id) ?? [])
      .filter((id) => titleById.has(id))
      .map((id) => ({ id, title: titleById.get(id) as string }));
  }
}
