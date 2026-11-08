import { FastifyInstance, FastifyRequest } from "fastify";
import { AgentEngagementStatusType } from "need4deed-sdk";
import { BadRequestError } from "../../../config";
import Agent from "../../../data/entity/opportunity/agent.entity";
import { verifyTokenOfType } from "./verify-token-of-type";

const INVALID_LINK = "This registration link is no longer valid.";

export async function findLinkableAgent(
  fastify: FastifyInstance,
  agentId: number,
): Promise<Pick<Agent, "id" | "title" | "engagementStatus"> | null> {
  const agent = await fastify.db.agentRepository.findOne({
    select: { id: true, title: true, engagementStatus: true },
    where: { id: agentId },
  });
  return agent && agent.engagementStatus !== AgentEngagementStatusType.INACTIVE
    ? agent
    : null;
}

export async function resolveNgoRegistrationOwner(
  request: FastifyRequest,
  token: string,
): Promise<number> {
  let payload: { agentId?: unknown };
  try {
    payload = await verifyTokenOfType<{ agentId?: unknown }>(
      request.server,
      token,
      "ngo-registration",
      INVALID_LINK,
      INVALID_LINK,
    );
  } catch {
    throw new BadRequestError(INVALID_LINK);
  }
  const agent =
    typeof payload.agentId === "number"
      ? await findLinkableAgent(request.server, payload.agentId)
      : null;
  if (!agent) {
    throw new BadRequestError(INVALID_LINK);
  }
  return agent.id;
}
