import { FastifyRequest } from "fastify";
import {
  ApiOpportunityOtherGetList,
  Lang,
  OpportunityStatusType,
  OpportunityType,
} from "need4deed-sdk";
import { ILike, In, Not, Raw } from "typeorm";
import { dtoOpportunityOtherGetList } from "../../../services/dto/dto-opportunity-other";
import { getCallerAgentIds } from "./get-caller-agent-ids";
import { escapeLikePattern } from "./person-name-ilike";
import { translateOpportunities } from "./translate-opportunities";

const OPEN_STATUSES = [
  OpportunityStatusType.NEW,
  OpportunityStatusType.SEARCHING,
];

export async function getOtherOpportunities(
  request: FastifyRequest,
  {
    skip,
    take,
    search,
    language,
  }: { skip: number; take: number; search?: string; language: Lang },
): Promise<{ data: ApiOpportunityOtherGetList[]; count: number }> {
  const ownAgentIds = await getCallerAgentIds(
    request,
    request.authUser?.personId,
  );
  if (ownAgentIds.length === 0) {
    return { data: [], count: 0 };
  }

  const [opportunities, count] =
    await request.server.db.opportunityRepository.findAndCount({
      where: {
        status: In(OPEN_STATUSES),
        type: Not(OpportunityType.ACCOMPANYING),
        agentId: Raw(
          (column) =>
            `${column} IS NOT NULL AND ${column} NOT IN (:...ownAgentIds)`,
          {
            ownAgentIds,
          },
        ),
        ...(search ? { title: ILike(`%${escapeLikePattern(search)}%`) } : {}),
      },
      relations: ["district", "agent.district"],
      order: { createdAt: "DESC", id: "DESC" },
      skip,
      take,
    });

  await translateOpportunities(request.server, opportunities, language);

  return { count, data: opportunities.map(dtoOpportunityOtherGetList) };
}
