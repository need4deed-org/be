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
import { getLanguageCode } from "../common";

const OPPORTUNITY_FIELDS = [
  ...translatedEntities[EntityTableName.OPPORTUNITY].fields,
];

// The `language` of a request's query (?language=, the response language) or
// body (a create form's, the language its text is entered in): en | de,
// German when missing or unknown, like the event and volunteer routes.
export function requestLanguage(queryOrBody: unknown): Lang {
  const language = (queryOrBody as { language?: unknown } | undefined)
    ?.language;
  return getLanguageCode(language as string) || Lang.DE;
}

/**
 * Shows opportunities' title and info in `lang` (be#1068): overlays the done
 * machine/human translations in place, falling back to the original text.
 * Reference titles in the same response (languages, activities, skills, …)
 * are never machine-translated.
 *
 * Call it after any save of these entities in the request (the overlay would
 * otherwise be written to the database) and before PII masking (so masking
 * isn't undone).
 */
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

// `info` goes to machine translation only for these types (be#1068); an
// accompanying opportunity's description is about one person's appointment.
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

/**
 * Queues an opportunity's title, and its info for regular/events, for
 * machine translation (be#1068). Call it in the transaction that writes the
 * text, with the values as saved. Unchanged text is left alone; an empty or
 * untranslated `info` (e.g. after a type change to accompanying) removes its
 * translations.
 */
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

// Opportunities queued per worker run by the backfill, so a run stays short.
const BACKFILL_LIMIT = 100;

/**
 * Queues opportunities that have text to translate but no translation rows
 * yet — those written before be#1068 (be#1068 backfill). Idempotent: once
 * queued, an opportunity has rows and is never picked again. At most `limit`
 * per call, searching ones first; returns how many were queued.
 */
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
    // Only rows that will get translation rows, or the same ones would be
    // picked on every run.
    .andWhere(
      "(btrim(o.title) <> '' OR (o.type IN (:...types) AND btrim(coalesce(o.info, '')) <> ''))",
      { types: TRANSLATED_INFO_TYPES },
    )
    // Opportunities volunteers can see first, then the rest by age.
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
