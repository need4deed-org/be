import { AgentRoleType } from "need4deed-sdk";
import AgentPerson from "../../../data/entity/m2m/agent-person";
import { getActiveAgentMemberships } from "./get-agent-memberships";

// Prefer VOLUNTEER_COORDINATOR; fall back to the earliest active membership
// (memberships is expected ordered by id ASC, per getActiveAgentMemberships).
// Single source of truth for "which membership represents this person" —
// keep GET /me's agentId (user.ts) in sync with this, not a reimplementation.
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
