import { FastifyRequest } from "fastify";
import { ApiAgentTagCandidate } from "need4deed-sdk";
import { In } from "typeorm";
import { dtoAgentTagCandidate } from "../../../services/dto/dto-agent";
import { escapeLikePattern } from "./person-name-ilike";
import { taggableAgentsQuery } from "./tag-agents";

const TAG_CANDIDATE_LIMIT = 20;

export async function getAgentTagCandidates(
  request: FastifyRequest,
  search?: string,
): Promise<ApiAgentTagCandidate[]> {
  const { query, ownAgentIds } = await taggableAgentsQuery(request);
  const ownDistrictIds = ownAgentIds.length
    ? (
        await request.server.db.agentRepository.find({
          select: { districtId: true },
          where: { id: In(ownAgentIds) },
        })
      )
        .map((agent) => agent.districtId)
        .filter((id): id is number => typeof id === "number")
    : [];

  query
    .leftJoin("agent.district", "district")
    .select("agent.id", "id")
    .addSelect("agent.title", "title")
    .addSelect("agent.district_id", "districtId")
    .addSelect("district.title", "districtTitle");
  if (ownDistrictIds.length) {
    query
      .addSelect(
        "CASE WHEN agent.district_id IN (:...ownDistrictIds) THEN 0 ELSE 1 END",
        "nearby_rank",
      )
      .setParameter("ownDistrictIds", ownDistrictIds)
      .orderBy("nearby_rank", "ASC");
  }
  if (search) {
    query.andWhere("agent.title ILIKE :search", {
      search: `%${escapeLikePattern(search)}%`,
    });
  }
  const rows = await query
    .addOrderBy("agent.title", "ASC")
    .limit(TAG_CANDIDATE_LIMIT)
    .getRawMany<{
      id: number;
      title: string;
      districtId: number | null;
      districtTitle: string | null;
    }>();

  return rows.map(dtoAgentTagCandidate);
}
