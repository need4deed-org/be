import { FastifyRequest } from "fastify";
import { UserRole } from "need4deed-sdk";
import { NotFoundError } from "../../../config";
import { getCallerAgentIds } from "./get-caller-agent-ids";

// An AGENT may only reach opportunities belonging to an agent they are an
// ACTIVE member of. 404 rather than 403 so a caller guessing ids can't tell
// an opportunity they don't own from one that doesn't exist. COORDINATOR and
// ADMIN callers are unaffected.
export async function assertAgentOwnsOpportunity(
  request: FastifyRequest,
  opportunityId: number,
  opportunityAgentId: number | null | undefined,
): Promise<void> {
  const { authUser } = request;
  if (authUser?.role !== UserRole.AGENT) {
    return;
  }

  const agentIds = await getCallerAgentIds(request, authUser.personId);

  if (!opportunityAgentId || !agentIds.includes(opportunityAgentId)) {
    throw new NotFoundError(`Opportunity (id:${opportunityId}) not found.`);
  }
}
