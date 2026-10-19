import { Lang } from "need4deed-sdk";
import { FindOptionsWhere } from "typeorm";
import { dataSource } from "../../../data/data-source";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import { QuerystringOpportunityFiltering } from "../../types";
import {
  opportunityCommuteIdWhere,
  resolveCommuteFilter,
} from "./commute-where";
import { findOpportunityAvailabilityDealIds } from "./get-availability-deal-ids";
import {
  getOpportunityWhere,
  OpportunityAppointmentFilter,
} from "./get-opportunity-where";
import { andIntoWhere } from "./merge-into-where";
import { languageIdOf } from "./translate-opportunities";

export async function getOpportunityListWhere(
  filter: QuerystringOpportunityFiltering["filter"],
  lang: Lang,
  appointment?: OpportunityAppointmentFilter,
): Promise<FindOptionsWhere<Opportunity> | FindOptionsWhere<Opportunity>[]> {
  const [searchLanguageId, availabilityDealIds, commute] = await Promise.all([
    filter?.search ? languageIdOf(dataSource.manager, lang) : undefined,
    findOpportunityAvailabilityDealIds(filter?.availability),
    resolveCommuteFilter(filter),
  ]);
  const where = getOpportunityWhere(
    filter,
    appointment,
    searchLanguageId,
    availabilityDealIds,
  );
  if (commute) {
    andIntoWhere(where, "id", opportunityCommuteIdWhere(commute));
  }
  return where;
}
