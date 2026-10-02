import { FastifyInstance } from "fastify";
import { EntityTableName, Lang, OpportunityType } from "need4deed-sdk";
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

// ?language= (en | de), German when missing or unknown, like the event and
// volunteer routes.
export function requestLanguage(query: unknown): Lang {
  const language = (query as { language?: unknown } | undefined)?.language;
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
