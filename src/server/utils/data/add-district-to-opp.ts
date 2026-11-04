import { OpportunityType } from "need4deed-sdk";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import {
  firstDistrictPostcode,
  getDistrictFromPostcode,
} from "../../../data/utils/get-district";

export function getDistrictToOpportunityHandler() {
  const updates: Opportunity[] = [];

  return {
    async addDistrictToOpportunity(
      opportunity: Opportunity,
    ): Promise<Opportunity> {
      if (opportunity.districtId) {
        return opportunity;
      }

      if (opportunity.type === OpportunityType.ACCOMPANYING) {
        const postcode = opportunity.accompanying?.postcode;
        if (postcode?.districtPostcode) {
          const districtId = firstDistrictPostcode(
            postcode.districtPostcode,
          )?.districtId;
          if (districtId) {
            opportunity.districtId = districtId;
            updates.push(opportunity);
            return opportunity;
          }
        } else {
          const postcodeOrId = postcode ?? opportunity.accompanying?.postcodeId;
          const district = postcodeOrId
            ? await getDistrictFromPostcode(postcodeOrId)
            : null;
          if (district) {
            opportunity.district = district;
            opportunity.districtId = district.id;
            updates.push(opportunity);
            return opportunity;
          }
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
        opportunity.districtId = districtFromAgent.id;
        updates.push(opportunity);
      }
      return opportunity;
    },
    updates,
  };
}
