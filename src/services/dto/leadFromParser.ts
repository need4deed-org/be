import { EntityTableName } from "need4deed-sdk";

import LeadFrom from "../../data/entity/lead.entity";
import { getInstanceByTranslation } from "../../server/utils";

export async function leadFromParser(
  leadFromData: string[],
): Promise<LeadFrom[]> {
  const leadFrom: LeadFrom[] = [];
  const lead = (leadFromData || []) as string[];
  for (const volunteerLead of lead) {
    const leadInstance = await getInstanceByTranslation(
      volunteerLead,
      LeadFrom,
      EntityTableName.LEAD,
    );
    if (leadInstance) {
      leadFrom.push(leadInstance);
    }
  }

  return leadFrom;
}
