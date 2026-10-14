import { FastifyRequest } from "fastify";
import { ApiAgentTagCandidate } from "need4deed-sdk";
import { escapeLikePattern } from "./person-name-ilike";
import { taggableAgentsQuery } from "./tag-agents";

const TAG_CANDIDATE_LIMIT = 20;

export async function getAgentTagCandidates(
  request: FastifyRequest,
  search?: string,
): Promise<ApiAgentTagCandidate[]> {
  const { query, ownAgentIds } = await taggableAgentsQuery(request);
  query.leftJoinAndSelect("agent.district", "district");
  if (ownAgentIds.length) {
    query
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
