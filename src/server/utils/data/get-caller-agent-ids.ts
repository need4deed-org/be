import { FastifyInstance } from "fastify";
import { AgentMembershipStatus } from "need4deed-sdk";

//  The agents this caller belongs to. Only ACTIVE memberships count. A PENDING
//  one is still waiting on a coordinator to approve it, so it grants nothing.
export async function getCallerAgentIds(
  fastify: FastifyInstance,
  personId: number | null | undefined,
): Promise<number[]> {
  if (personId === null || personId === undefined) {
    return [];
  }

  const memberships = await fastify.db.agentPersonRepository.find({
    where: { personId, status: AgentMembershipStatus.ACTIVE },
  });

  return [...new Set(memberships.map((m) => m.agentId))];
}
