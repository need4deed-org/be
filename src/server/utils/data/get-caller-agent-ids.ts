import { FastifyInstance } from "fastify";
import { AgentMembershipStatus } from "need4deed-sdk";

export async function getCallerAgentIds(
  fastify: FastifyInstance,
  personId: number | null | undefined,
): Promise<number[]> {
  if (!personId) {
    return [];
  }

  const memberships = await fastify.db.agentPersonRepository.find({
    where: { personId, status: AgentMembershipStatus.ACTIVE },
  });

  return [...new Set(memberships.map((m) => m.agentId))];
}
