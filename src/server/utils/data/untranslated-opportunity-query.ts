import { OpportunityStatusType, OpportunityType } from "need4deed-sdk";
import { EntityManager, SelectQueryBuilder } from "typeorm";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";

export const TRANSLATED_INFO_TYPES: readonly OpportunityType[] = [
  OpportunityType.REGULAR,
  OpportunityType.EVENTS,
];

export function buildUntranslatedOpportunityQuery(
  manager: EntityManager,
): SelectQueryBuilder<Opportunity> {
  return manager
    .createQueryBuilder(Opportunity, "o")
    .select(["o.id", "o.title", "o.info", "o.type", "o.originalLanguageId"])
    .where(
      "NOT EXISTS (SELECT 1 FROM field_translation ft WHERE ft.opportunity_id = o.id)",
    )
    .andWhere(
      "(btrim(o.title) <> '' OR (o.type IN (:...types) AND btrim(coalesce(o.info, '')) <> ''))",
      { types: TRANSLATED_INFO_TYPES },
    )
    .orderBy("o.status = :searching", "DESC")
    .addOrderBy("o.id")
    .setParameter("searching", OpportunityStatusType.SEARCHING);
}
