import Agent from "../../../data/entity/opportunity/agent.entity";
import { getDistrictFromPostcode } from "../../../data/utils/get-district";

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
