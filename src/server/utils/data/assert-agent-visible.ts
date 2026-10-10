import { UserRole } from "need4deed-sdk";
import { NotFoundError } from "../../../config";
import Agent from "../../../data/entity/opportunity/agent.entity";
import { isStaffRole } from "./is-staff-role";

export function assertAgentVisible(
  agent: Agent,
  role: UserRole | undefined,
): void {
  const isPrivileged = isStaffRole(role);
  if (agent.unclaimed && !isPrivileged) {
    throw new NotFoundError(`Agent (id:${agent.id}) not found.`);
  }
}
