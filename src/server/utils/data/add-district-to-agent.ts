import Postcode from "../../../data/entity/location/postcode.entity";
import Agent from "../../../data/entity/opportunity/agent.entity";
import { getDistrictFromPostcode } from "../../../data/utils/get-district";
import { Voidable } from "../types";

export function getDistrictToAgentHandler(isRepresentative = false) {
  const updates: Agent[] = [];

  return {
    async addDistrictToAgent(agent: Agent): Promise<Agent> {
      if (agent && !agent.districtId) {
        const district = await getDistrictFromPostcode(
          isRepresentative
            ? agent.representative?.person?.address?.postcode
            : agent.address?.postcode,
        );
        if (district) {
          agent.district = district;
          updates.push(agent);
        }
      }
      return agent;
    },
    updates,
  };
}

export async function syncAgentDistrictFromPostcode(
  agent: Agent,
  postcode?: Voidable<Postcode | number>,
): Promise<Agent> {
  const district = await getDistrictFromPostcode(
    postcode ?? agent.address?.postcode,
  );
  if (district) {
    agent.district = district;
    agent.districtId = district.id;
  }
  return agent;
}
