import { ApiOpportunityGetList } from "need4deed-sdk";
import Opportunity from "../../data/entity/opportunity/opportunity.entity";

export function dtoOpportunityGetList(
  opportunity: Opportunity,
): ApiOpportunityGetList {
  return {
    id: opportunity.id,
    title: opportunity.title,
    category: { id: opportunity.deal.profile.categoryId },
    type: opportunity.deal.profile.volunteeringType,
    status: opportunity.status,
  };
}
