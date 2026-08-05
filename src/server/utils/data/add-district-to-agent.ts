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

// Unlike addDistrictToAgent (read-time, fills in a district only when one
// isn't set yet), this always overwrites district from the given postcode.
// Used on write (PATCH /agent/:id) so district can't independently drift
// from postcode — a client-supplied districtId is never trusted; district is
// derived, not settable (be#827).
//
// Takes postcode explicitly (falling back to agent.address?.postcode if
// omitted) rather than requiring the caller to attach a loaded `address`
// relation onto `agent` first — mutating that relation before a save() risks
// TypeORM treating it as a related entity to persist.
export async function syncAgentDistrictFromPostcode(
  agent: Agent,
  postcode?: Voidable<Postcode>,
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
