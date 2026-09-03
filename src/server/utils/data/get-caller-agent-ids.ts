import { getActiveAgentMemberships } from "./get-agent-memberships";

//  The agents this caller belongs to. Only ACTIVE memberships count. A PENDING
//  one is still waiting on a coordinator to approve it, so it grants nothing.
export async function getCallerAgentIds(
  personId: number | null | undefined,
): Promise<number[]> {
  if (personId === null || personId === undefined) {
    return [];
  }

  const memberships = await getActiveAgentMemberships(personId);

  return [...new Set(memberships.map((m) => m.agentId))];
}
