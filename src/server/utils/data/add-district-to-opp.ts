import { OpportunityType } from "need4deed-sdk";
import District from "../../../data/entity/location/district.entity";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import { getDistrictFromPostcode } from "../../../data/utils/get-district";

export function getDistrictToOpportunityHandler() {
  const updates: Opportunity[] = [];

  return {
    async addDistrictToOpportunity(
      opportunity: Opportunity,
      accompanyingDistrict?: District | null,
    ): Promise<Opportunity> {
      if (opportunity.districtId) {
        return opportunity;
      }

      if (opportunity.type === OpportunityType.ACCOMPANYING) {
        let district: District | null;
        if (accompanyingDistrict !== undefined) {
          district = accompanyingDistrict;
        } else {
          const postcode =
            opportunity.accompanying?.postcode ??
            opportunity.accompanying?.postcodeId;
          district = postcode ? await getDistrictFromPostcode(postcode) : null;
        }
        if (district) {
          opportunity.district = district;
          updates.push(opportunity);
          return opportunity;
        }
      }

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
