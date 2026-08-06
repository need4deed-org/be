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
    info: body.vo_information,
    ...(body.accomp_translation
      ? { translationType: body.accomp_translation as TranslatedIntoType }
      : {}),
    // Mirror the patch path (parser-opportunity-patch-data.ts), which writes
    // the description into both info and infoConfidential together — the
    // ACCOMPANYING display reads infoConfidential (be#859), so creation must
    // keep them in sync too, not just leave infoConfidential to whatever
    // (currently always null) accomp_information carries.
    infoConfidential:
      type === OpportunityType.ACCOMPANYING
        ? body.vo_information
        : body.accomp_information,
    districtId: district?.id,
  });
}
