import {
  OpportunityLegacyFormData,
  OpportunityType,
  TranslatedIntoType,
} from "need4deed-sdk";
import Postcode from "../../data/entity/location/postcode.entity";
import Opportunity from "../../data/entity/opportunity/opportunity.entity";
import { getDistrictByTitle, getDistrictFromPostcode } from "../../data/utils";

export async function parseOpportunityLegacy(
  body: OpportunityLegacyFormData,
): Promise<Opportunity> {
  const type =
    body.opportunity_type === "accompanying"
      ? OpportunityType.ACCOMPANYING
      : body.onetime_date_time
        ? OpportunityType.EVENTS
        : OpportunityType.REGULAR;

  const district =
    type === OpportunityType.ACCOMPANYING
      ? ((await getDistrictFromPostcode(
          new Postcode({ value: body.accomp_postcode }),
        )) ?? undefined)
      : ((await getDistrictByTitle(body.berlin_locations?.[0] ?? "")) ??
        undefined);

  return new Opportunity({
    title: body.title,
    type,
    numberVolunteers: body.volunteers_number,
    info:
      type === OpportunityType.ACCOMPANYING ? undefined : body.vo_information,
    ...(body.accomp_translation
      ? { translationType: body.accomp_translation as TranslatedIntoType }
      : {}),
    infoConfidential:
      type === OpportunityType.ACCOMPANYING ? body.vo_information : undefined,
    districtId: district?.id,
  });
}
