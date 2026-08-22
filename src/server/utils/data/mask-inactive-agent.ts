import { AgentEngagementStatusType, UserRole } from "need4deed-sdk";
import Agent from "../../../data/entity/opportunity/agent.entity";

// An INACTIVE agent's opportunities/volunteers shouldn't read as live,
// actionable data (be#885), for anyone but coordinator/admin. Read live off
// engagementStatus (never snapshotted), so flipping the agent back to ACTIVE
// unmasks its next load immediately. Shared by GET /agent/:id/opportunity-linked
// and GET /agent/:id/volunteer-linked.
export function shouldMaskInactiveAgentData(
  agent: Pick<Agent, "engagementStatus">,
  role: UserRole | undefined,
): boolean {
  const isPrivileged = role === UserRole.COORDINATOR || role === UserRole.ADMIN;
  return (
    agent.engagementStatus === AgentEngagementStatusType.INACTIVE &&
    !isPrivileged
  );
}
