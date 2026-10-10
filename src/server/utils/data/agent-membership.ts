import { FastifyRequest } from "fastify";
import { UserRole } from "need4deed-sdk";
import { NotFoundError, UnauthorizedError } from "../../../config";
import { getCallerAgentIds } from "./get-caller-agent-ids";

const AGENT_SCOPED_ROLES: readonly UserRole[] = [
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

async function isAgentMemberOrStaff(
  request: FastifyRequest,
  agentId: number | null | undefined,
): Promise<boolean> {
  const role = request.authUser?.role;
  if (isAgentStaffRole(role)) {
    return true;
  }
  return role === UserRole.AGENT && isActiveAgentMember(request, agentId);
}

export async function assertAgentMemberOrStaffOr403(
  request: FastifyRequest,
  agentId: number | null | undefined,
  message: string,
): Promise<void> {
  if (!(await isAgentMemberOrStaff(request, agentId))) {
    throw new UnauthorizedError(message);
  }
}

export async function assertAgentMemberOrStaffOr404(
  request: FastifyRequest,
  agentId: number,
): Promise<void> {
  if (!(await isAgentMemberOrStaff(request, agentId))) {
    throw new NotFoundError(`Agent (id:${agentId}) not found.`);
  }
}
