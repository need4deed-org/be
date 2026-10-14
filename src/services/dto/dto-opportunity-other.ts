import { ApiOpportunityOtherGetList } from "need4deed-sdk";
import Opportunity from "../../data/entity/opportunity/opportunity.entity";

export function dtoOpportunityOtherGetList(
  opportunity: Opportunity,
): ApiOpportunityOtherGetList {
  const districtId = opportunity.districtId ?? opportunity.agent?.districtId;
  const districtTitle =
    opportunity.district?.title ?? opportunity.agent?.district?.title;
  return {
    id: opportunity.id,
    title: opportunity.title,
    district: districtId
      ? { id: districtId, title: { de: districtTitle } }
      : null,
    createdAt: opportunity.createdAt,
  };
}
