import { FastifyInstance } from "fastify";
import {
  EntityTableName,
  Lang,
  OpportunityStatusType,
  OpportunityType,
} from "need4deed-sdk";
import { EntityManager } from "typeorm";
import { dataSource } from "../../../data/data-source";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import { languageIds } from "../../../services/translation/languages";
import { enqueue } from "../../../services/translation/queue";
import { translatedEntities } from "../../../services/translation/registry";
import { writeHumanTranslations } from "../../../services/translation/write";
import { getLanguageCode } from "../common";

const OPPORTUNITY_FIELDS = [
  ...translatedEntities[EntityTableName.OPPORTUNITY].fields,
];

export function editLanguage(query: unknown): Lang | null {
  return getLanguageCode(
    (query as { language?: unknown } | undefined)?.language as string,
  );
}

export function requestLanguage(queryOrBody: unknown): Lang {
  return editLanguage(queryOrBody) ?? Lang.DE;
}

export async function translateOpportunities(
  fastify: FastifyInstance,
  opportunities: Opportunity[],
  lang: Lang,
): Promise<void> {
  if (opportunities.length === 0) {
    return;
  }
  await fastify.translation.resolve(
    dataSource.manager,
    EntityTableName.OPPORTUNITY,
    opportunities,
    OPPORTUNITY_FIELDS,
    lang,
  );
}

const TRANSLATED_INFO_TYPES: readonly OpportunityType[] = [
  OpportunityType.REGULAR,
  OpportunityType.EVENTS,
];

export async function languageIdOf(
  manager: EntityManager,
  lang: Lang,
): Promise<number> {
  return (await languageIds(manager)).idOf[lang];
}

export async function queueOpportunityTranslation(
  manager: EntityManager,
  opportunity: Pick<
    Opportunity,
    "id" | "title" | "info" | "type" | "originalLanguageId"
  >,
): Promise<void> {
  await enqueue(manager, EntityTableName.OPPORTUNITY, opportunity, {
    title: opportunity.title,
    info: TRANSLATED_INFO_TYPES.includes(opportunity.type)
      ? opportunity.info
      : null,
  });
}

export async function divertTranslatedEdits(
  manager: EntityManager,
  opportunity: Pick<Opportunity, "id">,
  patch: Partial<Opportunity>,
  submitted: Pick<Partial<Opportunity>, "title" | "info">,
  effectiveType: OpportunityType,
  lang: Lang | null,
): Promise<void> {
  if (!lang) {
    return;
  }
  const current = await manager.findOneOrFail(Opportunity, {
    where: { id: opportunity.id },
    lock: { mode: "pessimistic_write" },
  });
  const fields: ("title" | "info")[] = TRANSLATED_INFO_TYPES.includes(
    effectiveType,
  )
    ? ["title", "info"]
    : ["title"];
  const diverted = await writeHumanTranslations(
    manager,
    EntityTableName.OPPORTUNITY,
    current,
    lang,
    Object.fromEntries(fields.map((field) => [field, submitted[field]])),
  );
  if (!diverted) {
    return;
  }
  for (const field of fields) {
    if (submitted[field] !== undefined) {
      delete patch[field];
    }
  }
}

const BACKFILL_LIMIT = 100;

export async function queueUntranslatedOpportunities(
  manager: EntityManager,
  limit = BACKFILL_LIMIT,
): Promise<number> {
  const opportunities = await manager
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
    .setParameter("searching", OpportunityStatusType.SEARCHING)
    .limit(limit)
    .getMany();
  for (const opportunity of opportunities) {
    await manager.transaction((transactionalManager) =>
      queueOpportunityTranslation(transactionalManager, opportunity),
    );
  }
  return opportunities.length;
}
