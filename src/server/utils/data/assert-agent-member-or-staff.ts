import { FastifyRequest } from "fastify";
import { UserRole } from "need4deed-sdk";
import { NotFoundError } from "../../../config";
import { isActiveAgentMember, isAgentStaffRole } from "./agent-membership";

export async function assertAgentMemberOrStaff(
  request: FastifyRequest,
  agentId: number,
): Promise<void> {
  const role = request.authUser?.role;
  if (isAgentStaffRole(role)) {
    return;
  }
  if (
    role !== UserRole.AGENT ||
    !(await isActiveAgentMember(request, agentId))
  ) {
    throw new NotFoundError(`Agent (id:${agentId}) not found.`);
  }
}
