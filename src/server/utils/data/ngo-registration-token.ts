import { FastifyRequest } from "fastify";
import { AgentEngagementStatusType } from "need4deed-sdk";
import { BadRequestError } from "../../../config";

const INVALID_LINK = "This registration link is no longer valid.";

export async function resolveNgoRegistrationOwner(
  request: FastifyRequest,
  token: string,
): Promise<number> {
  let payload: { agentId?: unknown; type?: unknown };
  try {
    payload = await request.server.jwt.verify(token);
  } catch {
    throw new BadRequestError(INVALID_LINK);
  }
  if (
    payload.type !== "ngo-registration" ||
    typeof payload.agentId !== "number"
  ) {
    throw new BadRequestError(INVALID_LINK);
  }
  const agent = await request.server.db.agentRepository.findOne({
    select: { id: true, engagementStatus: true },
    where: { id: payload.agentId },
  });
  if (!agent || agent.engagementStatus === AgentEngagementStatusType.INACTIVE) {
    throw new BadRequestError(INVALID_LINK);
  }
  return agent.id;
}
