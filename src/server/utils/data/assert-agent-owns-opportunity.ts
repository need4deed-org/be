import { FastifyRequest } from "fastify";
import { UserRole } from "need4deed-sdk";
import { NotFoundError } from "../../../config";
import { getCallerAgentIds } from "./get-caller-agent-ids";

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
