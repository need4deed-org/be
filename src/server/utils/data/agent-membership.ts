import { FastifyRequest } from "fastify";
import { UserRole } from "need4deed-sdk";
import { UnauthorizedError } from "../../../config";
import { getCallerAgentIds } from "./get-caller-agent-ids";

export const AGENT_SCOPED_ROLES: readonly UserRole[] = [
  UserRole.COORDINATOR,
  UserRole.AGENT,
  UserRole.ADMIN,
];

export function isAgentStaffRole(role: UserRole | undefined): boolean {
  return role === UserRole.COORDINATOR || role === UserRole.ADMIN;
}

export function assertRoleIn(
  request: FastifyRequest,
  roles: readonly UserRole[] = AGENT_SCOPED_ROLES,
): void {
  const role = request.authUser?.role;
  if (!role || !roles.includes(role)) {
    throw new UnauthorizedError();
  }
}

export async function isActiveAgentMember(
  request: FastifyRequest,
  agentId: number | null | undefined,
): Promise<boolean> {
  if (agentId === null || agentId === undefined) {
    return false;
  }
  const agentIds = await getCallerAgentIds(request, request.authUser?.personId);
  return agentIds.includes(agentId);
}

export async function assertActiveAgentMemberOrStaff(
  request: FastifyRequest,
  agentId: number | null | undefined,
  message: string,
): Promise<void> {
  if (isAgentStaffRole(request.authUser?.role)) {
    return;
  }
  if (!(await isActiveAgentMember(request, agentId))) {
    throw new UnauthorizedError(message);
  }
}
