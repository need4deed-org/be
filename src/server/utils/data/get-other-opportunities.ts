import { FastifyRequest } from "fastify";
import {
  ApiOpportunityOtherGetList,
  Lang,
  OpportunityStatusType,
} from "need4deed-sdk";
import { ILike, In, Not } from "typeorm";
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
  const [opportunities, count] =
    await request.server.db.opportunityRepository.findAndCount({
      select: { id: true, title: true, districtId: true, createdAt: true },
      where: {
        status: In(OPEN_STATUSES),
        ...(ownAgentIds.length ? { agentId: Not(In(ownAgentIds)) } : {}),
        ...(search ? { title: ILike(`%${escapeLikePattern(search)}%`) } : {}),
      },
      relations: ["district"],
      order: { createdAt: "DESC" },
      skip,
      take,
    });

  await translateOpportunities(request.server, opportunities, language);

  return {
    count,
    data: opportunities.map((opportunity) => ({
      id: opportunity.id,
      title: opportunity.title,
      district: opportunity.districtId
        ? {
            id: opportunity.districtId,
            title: { de: opportunity.district?.title },
          }
        : null,
      createdAt: opportunity.createdAt,
    })),
  };
}
