import { FastifyInstance } from "fastify";
import { EntityTableName, Lang } from "need4deed-sdk";
import { dataSource } from "../../../data/data-source";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
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
