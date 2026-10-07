import { UserRole } from "need4deed-sdk";
import { NotFoundError } from "../../../config";
import Agent from "../../../data/entity/opportunity/agent.entity";

export function assertAgentVisible(
  agent: Agent,
  role: UserRole | undefined,
): void {
  const isPrivileged = role === UserRole.COORDINATOR || role === UserRole.ADMIN;
  if (agent.unclaimed && !isPrivileged) {
    throw new NotFoundError(`Agent (id:${agent.id}) not found.`);
  }
}
