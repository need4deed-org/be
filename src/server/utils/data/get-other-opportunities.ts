import { FastifyRequest } from "fastify";
import {
  ApiOpportunityOtherGetList,
  Lang,
  OpportunityStatusType,
  OpportunityType,
} from "need4deed-sdk";
import { FindOptionsWhere, In, Not } from "typeorm";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import { dtoOpportunityOtherGetList } from "../../../services/dto/dto-opportunity-other";
import { getCallerAgentIds } from "./get-caller-agent-ids";
import { getSearchBranches } from "./get-opportunity-where";
import { escapeLikePattern } from "./person-name-ilike";
import {
  languageIdOf,
  translateOpportunities,
} from "./translate-opportunities";

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

  const repository = request.server.db.opportunityRepository;
  const base: FindOptionsWhere<Opportunity> = {
    status: In(OPEN_STATUSES),
    type: Not(OpportunityType.ACCOMPANYING),
    // NOT IN is never true for NULL, so NGO-less rows are left out too.
    agentId: Not(In(ownAgentIds)),
  };
  // Title only: the rows show no other text, so searching it would leak.
  const where = search
    ? getSearchBranches(
        `%${escapeLikePattern(search)}%`,
        await languageIdOf(repository.manager, language),
        ["title"],
      ).map((branch) => ({ ...base, ...branch }))
    : base;

  const [opportunities, count] = await repository.findAndCount({
    where,
    relations: ["district", "agent.district"],
    order: { createdAt: "DESC", id: "DESC" },
    skip,
    take,
  });

  await translateOpportunities(request.server, opportunities, language);

  return { count, data: opportunities.map(dtoOpportunityOtherGetList) };
}
