import { OpportunityLegacyFormData, OpportunityType } from "need4deed-sdk";
import Opportunity from "../../data/entity/opportunity/opportunity.entity";

export function parseOpportunityLegacy(
  body: OpportunityLegacyFormData,
): Opportunity {
  return {
    title: body.title,
    type:
      body.opportunity_type === "volunteering"
        ? OpportunityType.REGULAR
        : OpportunityType.ACCOMPANYING,
    numberVolunteers: body.volunteers_number,
    info: body.vo_information,
    translationType: body.accomp_translation,
    infoConfidential: body.accomp_information,
  } as Opportunity;
}
