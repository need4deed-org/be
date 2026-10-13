import { In } from "typeorm";
import { dataSource } from "../../../data/data-source";
import Deal from "../../../data/entity/deal.entity";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import { getRepository } from "../../../data/utils";

const DEAL_LIST_RELATIONS = [
  "dealActivity.activity",
  "dealLanguage.language",
  "dealTimeslot.timeslot",
  "dealDistrict.district",
];

// A where on a deal relation also trims the loaded relation to the matching rows.
export async function reloadDealRelations(
  opportunities: Opportunity[],
): Promise<void> {
  const dealIds = opportunities
    .map((opportunity) => opportunity.deal?.id)
    .filter((id): id is number => id !== undefined);
  if (dealIds.length === 0) {
    return;
  }
  const deals = await getRepository(dataSource, Deal).find({
    where: { id: In(dealIds) },
    relations: DEAL_LIST_RELATIONS,
  });
  const dealById = new Map(deals.map((deal) => [deal.id, deal]));
  for (const opportunity of opportunities) {
    const full = opportunity.deal && dealById.get(opportunity.deal.id);
    if (full) {
      opportunity.deal.dealActivity = full.dealActivity;
      opportunity.deal.dealLanguage = full.dealLanguage;
      opportunity.deal.dealTimeslot = full.dealTimeslot;
      opportunity.deal.dealDistrict = full.dealDistrict;
    }
  }
}
