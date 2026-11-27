import { FastifyRequest } from "fastify";
import { AgentMembershipStatus, AgentRoleType, UserRole } from "need4deed-sdk";
import { UnauthorizedError } from "../../../config";
import { isStaffRole } from "./is-staff-role";

export interface GroupCoordinatorScope {
  groupIds: number[];
  agentIds: number[];
  isGroupAdmin: boolean;
}

type GroupMembershipRow = {
  group_id: number;
  agent_id: number | null;
  organization_id: number | null;
  role: AgentRoleType;
};

export async function resolveGroupCoordinatorScope(
  request: FastifyRequest,
): Promise<GroupCoordinatorScope | null> {
  if (request.groupCoordinatorScope !== undefined) {
    return request.groupCoordinatorScope;
  }

  const user = request.authUser;
  if (
    !user ||
    !user.personId ||
    user.role === UserRole.ADMIN ||
    (user.role !== UserRole.COORDINATOR && user.role !== UserRole.AGENT)
  ) {
    request.groupCoordinatorScope = null;
    return null;
  }

  const manager = request.server?.db?.volunteerGroupRepository?.manager;
  if (!manager) {
    request.groupCoordinatorScope = null;
    return null;
  }
  const rows: GroupMembershipRow[] = await manager.query(
    `SELECT vg.id AS group_id, vg.agent_id, vg.organization_id, ap.role::text AS role
       FROM volunteer_group vg
       JOIN agent_person ap ON ap.agent_id = vg.agent_id
      WHERE ap.person_id = $1 AND ap.status::text = $2
     UNION ALL
     SELECT vg.id AS group_id, vg.agent_id, vg.organization_id, op.role::text AS role
       FROM volunteer_group vg
       JOIN organization_person op ON op.organization_id = vg.organization_id
      WHERE op.person_id = $1 AND op.status::text = $2`,
    [user.personId, AgentMembershipStatus.ACTIVE],
  );

  if (rows.length === 0) {
    request.groupCoordinatorScope = null;
    return null;
  }

  const groupIds = [...new Set(rows.map((row) => Number(row.group_id)))];
  const agentIdSet = new Set<number>();
  const orgIds: number[] = [];

  for (const row of rows) {
    if (row.agent_id !== null) {
      agentIdSet.add(Number(row.agent_id));
    }
    if (row.organization_id !== null) {
      orgIds.push(Number(row.organization_id));
    }
  }

  if (orgIds.length > 0) {
    const orgAgents: { id: number }[] = await manager.query(
      "SELECT id FROM agent WHERE organization_id = ANY($1)",
      [[...new Set(orgIds)]],
    );
    for (const agent of orgAgents) {
      agentIdSet.add(Number(agent.id));
    }
  }

  const scope: GroupCoordinatorScope = {
    groupIds,
    agentIds: [...agentIdSet],
    isGroupAdmin: rows.some((row) => row.role === AgentRoleType.MANAGER),
  };
  request.groupCoordinatorScope = scope;
  return scope;
}

export function isAgentInGroupScope(
  scope: GroupCoordinatorScope,
  agentId: number | null | undefined,
): boolean {
  return (
    agentId !== null &&
    agentId !== undefined &&
    scope.agentIds.includes(agentId)
  );
}

export async function isCoordinatorOrGroupCoordinator(
  request: FastifyRequest,
): Promise<boolean> {
  if (isStaffRole(request.authUser?.role)) {
    return true;
  }
  return (await resolveGroupCoordinatorScope(request)) !== null;
}

export async function assertCoordinatorOrGroupCoordinator(
  request: FastifyRequest,
): Promise<GroupCoordinatorScope | null> {
  if (isStaffRole(request.authUser?.role)) {
    return resolveGroupCoordinatorScope(request);
  }
  const groupScope = await resolveGroupCoordinatorScope(request);
  if (!groupScope) {
    throw new UnauthorizedError("Permission denied");
  }
  return groupScope;
}
