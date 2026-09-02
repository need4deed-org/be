import { OpportunityType } from "need4deed-sdk";
import District from "../../../data/entity/location/district.entity";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import { getDistrictFromPostcode } from "../../../data/utils/get-district";

export function getDistrictToOpportunityHandler() {
  const updates: Opportunity[] = [];

  return {
    async addDistrictToOpportunity(
      opportunity: Opportunity,
      // Optional caller-side precomputed resolution of the accompanying's
      // own postcode -> district (e.g. GET /:id needs this same value for
      // its response DTO) — pass it to reuse instead of querying it twice.
      accompanyingDistrict?: District | null,
    ): Promise<Opportunity> {
      if (opportunity.districtId) {
        return opportunity;
      }

      // ACCOMPANYING: derive from the appointment's own postcode (be#895).
      // `deal.postcode` mirrors the agent's own postcode — an unrelated
      // concept — so it isn't used here.
      if (opportunity.type === OpportunityType.ACCOMPANYING) {
        const postcode =
          opportunity.accompanying?.postcode ??
          opportunity.accompanying?.postcodeId;
        const district =
          accompanyingDistrict !== undefined
            ? accompanyingDistrict
            : postcode
              ? await getDistrictFromPostcode(postcode)
              : null;
        if (district) {
          opportunity.district = district;
          updates.push(opportunity);
          return opportunity;
        }
      }

      // REGULAR/EVENTS use the opportunity's own agent's district (be#895).
      // Also the fallback for an ACCOMPANYING opportunity whose appointment
      // postcode didn't resolve to a district. `agent.districtId` is an
      // already-loaded FK column wherever `agent` is loaded at all, no extra
      // relation needed.
      if (opportunity.agent?.districtId) {
        opportunity.districtId = opportunity.agent.districtId;
        updates.push(opportunity);
        return opportunity;
      }

      const districtFromAgent = await getDistrictFromPostcode(
        opportunity.agent?.address?.postcode,
      );
      if (districtFromAgent) {
        opportunity.district = districtFromAgent;
        updates.push(opportunity);
      }
      return opportunity;
    },
    updates,
  };
}
