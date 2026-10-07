import { FastifyRequest } from "fastify";
import { UserRole } from "need4deed-sdk";
import { NotFoundError } from "../../../config";
import { getCallerAgentIds } from "./get-caller-agent-ids";

// Staff may read any NGO's data, NGO users only their own NGOs' (active
// memberships). 404 otherwise, like the other agent sub-routes.
export async function assertAgentMemberOrStaff(
  request: FastifyRequest,
  agentId: number,
): Promise<void> {
  const role = request.authUser?.role;
  if (role === UserRole.COORDINATOR || role === UserRole.ADMIN) {
    return;
  }
  const agentIds =
    role === UserRole.AGENT
      ? await getCallerAgentIds(request, request.authUser?.personId)
      : [];
  if (!agentIds.includes(agentId)) {
    throw new NotFoundError(`Agent (id:${agentId}) not found.`);
  }
}
