import { FastifyRequest } from "fastify";
import { getActiveAgentMemberships } from "./get-agent-memberships";

export async function getCallerAgentIds(
  request: FastifyRequest,
  personId: number | null | undefined,
): Promise<number[]> {
  if (request.callerAgentIds) {
    return request.callerAgentIds;
  }

  if (personId === null || personId === undefined) {
    return [];
  }

  const memberships = await getActiveAgentMemberships(personId);
  const agentIds = [...new Set(memberships.map((m) => m.agentId))];

  request.callerAgentIds = agentIds;
  return agentIds;
}
