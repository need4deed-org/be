import { FastifyRequest } from "fastify";
import { AgentEngagementStatusType, ApiAgentTagCandidate } from "need4deed-sdk";
import { getCallerAgentIds } from "./get-caller-agent-ids";
import { escapeLikePattern } from "./person-name-ilike";

const TAG_CANDIDATE_LIMIT = 20;

export async function getAgentTagCandidates(
  request: FastifyRequest,
  search?: string,
): Promise<ApiAgentTagCandidate[]> {
  const ownAgentIds = await getCallerAgentIds(
    request,
    request.authUser?.personId,
  );

  const query = request.server.db.agentRepository
    .createQueryBuilder("agent")
    .leftJoinAndSelect("agent.district", "district")
    .where("agent.unclaimed = false")
    .andWhere(
      "(agent.engagementStatus IS NULL OR agent.engagementStatus != :inactive)",
      { inactive: AgentEngagementStatusType.INACTIVE },
    );
  if (ownAgentIds.length) {
    query
      .andWhere("agent.id NOT IN (:...ownAgentIds)", { ownAgentIds })
      .addSelect(
        `CASE WHEN agent.district_id IN (SELECT own.district_id FROM agent own WHERE own.id IN (:...ownAgentIds)) THEN 0 ELSE 1 END`,
        "nearby_rank",
      )
      .orderBy("nearby_rank", "ASC");
  }
  if (search) {
    query.andWhere("agent.title ILIKE :search", {
      search: `%${escapeLikePattern(search)}%`,
    });
  }
  const agents = await query
    .addOrderBy("agent.title", "ASC")
    .take(TAG_CANDIDATE_LIMIT)
    .getMany();

  return agents.map((agent) => ({
    id: agent.id,
    title: agent.title,
    district: agent.districtId
      ? {
          id: agent.districtId,
          title: { de: agent.district?.title, en: agent.district?.title },
        }
      : null,
  }));
}
