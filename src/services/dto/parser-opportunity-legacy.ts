import { OpportunityLegacyFormData, OpportunityType } from "need4deed-sdk";
import Opportunity from "../../data/entity/opportunity/opportunity.entity";

export function parseOpportunityLegacy(
  body: OpportunityLegacyFormData,
): Opportunity {
  const type =
    body.opportunity_type === "accompanying"
      ? OpportunityType.ACCOMPANYING
      : body.onetime_date_time
        ? OpportunityType.EVENTS
        : OpportunityType.REGULAR;

  return {
    title: body.title,
    type,
    numberVolunteers: body.volunteers_number,
    info: body.vo_information,
    translationType: body.accomp_translation,
    infoConfidential: body.accomp_information,
  } as Opportunity;
}
