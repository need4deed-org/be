import { AgentRoleType } from "need4deed-sdk";
import AgentPerson from "../../../data/entity/m2m/agent-person";
import { getActiveAgentMemberships } from "./get-agent-memberships";

export function pickRepresentativeMembership(
  memberships: AgentPerson[],
): AgentPerson | undefined {
  return (
    memberships.find((m) => m.role === AgentRoleType.VOLUNTEER_COORDINATOR) ??
    memberships[0]
  );
}

export async function getAgentPersonRepresentative(
  personId: number,
  agentId?: number,
): Promise<AgentPerson | null> {
  const memberships = await getActiveAgentMemberships(personId, agentId);
  return pickRepresentativeMembership(memberships) ?? null;
}
