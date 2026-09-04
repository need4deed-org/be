import { FastifyRequest } from "fastify";
import { getActiveAgentMemberships } from "./get-agent-memberships";

//  The agents this caller belongs to. Only ACTIVE memberships count. A PENDING
//  one is still waiting on a coordinator to approve it, so it grants nothing.
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
