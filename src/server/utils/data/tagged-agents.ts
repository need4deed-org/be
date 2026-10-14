import { FastifyInstance } from "fastify";
import { In } from "typeorm";
import Agent from "../../../data/entity/opportunity/agent.entity";

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

export async function findTaggedAgents(
  fastify: FastifyInstance,
  text: string,
): Promise<Agent[]> {
  const ids = getTaggedAgentIds(text);
  return ids.length
    ? fastify.db.agentRepository.findBy({ id: In(ids), unclaimed: false })
    : [];
}
