import { FastifyRequest } from "fastify";
import { AgentEngagementStatusType, ApiAgentTagCandidate } from "need4deed-sdk";
import { ILike, In, Not } from "typeorm";
import { getCallerAgentIds } from "./get-caller-agent-ids";
import { escapeLikePattern } from "./person-name-ilike";

const TAG_CANDIDATE_LIMIT = 20;

export async function getAgentTagCandidates(
  request: FastifyRequest,
  search?: string,
): Promise<ApiAgentTagCandidate[]> {
  const agentRepository = request.server.db.agentRepository;
  const ownAgentIds = await getCallerAgentIds(
    request,
    request.authUser?.personId,
  );
  const ownDistrictIds = ownAgentIds.length
    ? (
        await agentRepository.find({
          select: { id: true, districtId: true },
          where: { id: In(ownAgentIds) },
        })
      )
        .map((a) => a.districtId)
        .filter((id): id is number => id !== null && id !== undefined)
    : [];

  const agents = await agentRepository.find({
    select: { id: true, title: true, districtId: true },
    where: {
      unclaimed: false,
      engagementStatus: Not(AgentEngagementStatusType.INACTIVE),
      ...(ownAgentIds.length ? { id: Not(In(ownAgentIds)) } : {}),
      ...(search ? { title: ILike(`%${escapeLikePattern(search)}%`) } : {}),
    },
    relations: ["district"],
    order: { title: "ASC" },
  });

  const isNearby = (districtId: number | null | undefined) =>
    districtId !== null &&
    districtId !== undefined &&
    ownDistrictIds.includes(districtId);

  return agents
    .sort(
      (a, b) => Number(isNearby(b.districtId)) - Number(isNearby(a.districtId)),
    )
    .slice(0, TAG_CANDIDATE_LIMIT)
    .map((agent) => ({
      id: agent.id,
      title: agent.title,
      district: agent.districtId
        ? { id: agent.districtId, title: { de: agent.district?.title } }
        : null,
    }));
}
