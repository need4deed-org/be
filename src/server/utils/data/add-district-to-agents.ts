import Agent from "../../../data/entity/opportunity/agent.entity";
import { getDistrictFromPostcode } from "../../../data/utils/get-district";

export function getDistrictToAgentHandler() {
  const updates: Agent[] = [];

  return {
    async addDistrictToAgent(agent: Agent): Promise<Agent> {
      if (!agent.districtId) {
        const district = await getDistrictFromPostcode(agent.address?.postcode);
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
