import { fastify } from "../../server";

import LeadFrom from "../../data/entity/lead.entity";
import { TranslationEntityType } from "../../data/types";
import { getInstanceByTranslation } from "../../server/utils";

export async function leadFromParser(
  leadFromData: string[],
): Promise<LeadFrom[]> {
  fastify.log.debug(`Lead from data: ${JSON.stringify(leadFromData)}`);

  const leadFrom: LeadFrom[] = [];
  const lead = (leadFromData || []) as string[];
  for (const volunteerLead of lead) {
    const leadInstance = await getInstanceByTranslation(
      volunteerLead,
      LeadFrom,
      TranslationEntityType.LEAD,
    );
    if (leadInstance) {
      leadFrom.push(leadInstance);
    }
  }

  return leadFrom;
}
