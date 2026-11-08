import { FastifyRequest } from "fastify";
import { UserRole } from "need4deed-sdk";
import { NotFoundError } from "../../../config";
import { getCallerAgentIds } from "./get-caller-agent-ids";

export async function agentOwnsOpportunity(
  request: FastifyRequest,
  opportunityAgentId: number | null | undefined,
): Promise<boolean> {
  const agentIds = await getCallerAgentIds(request, request.authUser?.personId);
  return !!opportunityAgentId && agentIds.includes(opportunityAgentId);
}

export async function assertAgentOwnsOpportunity(
  request: FastifyRequest,
  opportunityId: number,
  opportunityAgentId: number | null | undefined,
): Promise<void> {
  if (request.authUser?.role !== UserRole.AGENT) {
    return;
  }
  if (!(await agentOwnsOpportunity(request, opportunityAgentId))) {
    throw new NotFoundError(`Opportunity (id:${opportunityId}) not found.`);
  }
}
