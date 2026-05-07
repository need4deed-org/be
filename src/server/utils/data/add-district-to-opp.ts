import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import { getDistrictFromPostcode } from "../../../data/utils/get-district";

export function getDistrictToOpportunityHandler() {
  const updates: Opportunity[] = [];

  return {
    async addDistrictToOpportunity(
      opportunity: Opportunity,
    ): Promise<Opportunity> {
      if (!opportunity || opportunity.districtId) {
        return opportunity;
      }
      if (opportunity.agent?.districtId) {
        opportunity.districtId = opportunity.agent.districtId;
        updates.push(opportunity);
        return opportunity;
      }
      const district = await getDistrictFromPostcode(
        opportunity.agent?.address?.postcode,
      );
      if (district) {
        opportunity.district = district;
        updates.push(opportunity);
      }
      return opportunity;
    },
    updates,
  };
}
