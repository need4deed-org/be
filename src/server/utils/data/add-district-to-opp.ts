import { OpportunityType } from "need4deed-sdk";
import Postcode from "../../../data/entity/location/postcode.entity";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import {
  firstDistrictPostcode,
  getDistrictFromPostcode,
} from "../../../data/utils/get-district";

async function districtOf(
  postcode: Postcode | number,
): Promise<number | undefined> {
  if (typeof postcode !== "number" && postcode.districtPostcode) {
    return firstDistrictPostcode(postcode.districtPostcode)?.districtId;
  }
  return (await getDistrictFromPostcode(postcode))?.id;
}

export function getDistrictToOpportunityHandler() {
  const updates: Opportunity[] = [];

  return {
    async addDistrictToOpportunity(
      opportunity: Opportunity,
    ): Promise<Opportunity> {
      if (opportunity.districtId) {
        return opportunity;
      }

      const ownAddressPostcode =
        opportunity.address?.postcode ?? opportunity.address?.postcodeId;
      if (ownAddressPostcode) {
        const district = await districtOf(ownAddressPostcode);
        if (district) {
          opportunity.districtId = district;
          updates.push(opportunity);
        }
        // an own address outside any district never falls back to the NGO's
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
