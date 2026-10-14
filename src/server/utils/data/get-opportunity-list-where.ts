import { Lang } from "need4deed-sdk";
import { FindOptionsWhere } from "typeorm";
import { dataSource } from "../../../data/data-source";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import { QuerystringOpportunityFiltering } from "../../types";
import { findOpportunityAvailabilityDealIds } from "./get-availability-deal-ids";
import {
  getOpportunityWhere,
  OpportunityAppointmentFilter,
} from "./get-opportunity-where";
import { languageIdOf } from "./translate-opportunities";

// Shared by the opportunity list routes: resolves the search language and the
// availability deal ids, then builds the where.
export async function getOpportunityListWhere(
  filter: QuerystringOpportunityFiltering["filter"],
  lang: Lang,
  appointment?: OpportunityAppointmentFilter,
): Promise<FindOptionsWhere<Opportunity> | FindOptionsWhere<Opportunity>[]> {
  const [searchLanguageId, availabilityDealIds] = await Promise.all([
    filter?.search ? languageIdOf(dataSource.manager, lang) : undefined,
    findOpportunityAvailabilityDealIds(filter?.availability),
  ]);
  return getOpportunityWhere(
    filter,
    appointment,
    searchLanguageId,
    availabilityDealIds,
  );
}
