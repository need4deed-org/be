import { EntityTableName, Lang } from "need4deed-sdk";
import { dataSource } from "../../data/data-source";
import Opportunity from "../../data/entity/opportunity/opportunity.entity";
import logger from "../../logger";
import { resolve } from "../translation/resolve";

type TitleSource = Pick<Opportunity, "id" | "title" | "originalLanguageId">;

// Resolves onto a copy so the shared entity keeps its original title for the other language.
export async function opportunityTitleIn(
  opportunity: TitleSource | undefined,
  lang: Lang,
): Promise<string> {
  const raw = opportunity?.title ?? "";
  if (!opportunity?.id || !raw.trim()) {
    return raw;
  }
  try {
    const [copy] = await resolve(
      dataSource.manager,
      EntityTableName.OPPORTUNITY,
      [
        {
          id: opportunity.id,
          originalLanguageId: opportunity.originalLanguageId,
          title: raw,
        },
      ],
      ["title"],
      lang,
    );
    return copy.title;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn(
      `[notify] opportunity ${opportunity.id}: ${lang} title lookup failed, using the original: ${message}`,
    );
    return raw;
  }
}

export async function localizedOpportunityTitle(
  opportunity: TitleSource | undefined,
): Promise<Record<Lang, string>> {
  const [en, de] = await Promise.all([
    opportunityTitleIn(opportunity, Lang.EN),
    opportunityTitleIn(opportunity, Lang.DE),
  ]);
  return { [Lang.EN]: en, [Lang.DE]: de };
}
