import { Lang } from "need4deed-sdk";
import { EntityManager } from "typeorm";
import { languageIds } from "../../../services/translation/languages";
import { getLanguageCode } from "../common";

export function editLanguage(query: unknown): Lang | null {
  return getLanguageCode(
    (query as { language?: unknown } | undefined)?.language as string,
  );
}

export function requestLanguage(queryOrBody: unknown): Lang {
  return editLanguage(queryOrBody) ?? Lang.DE;
}

export async function languageIdOf(
  manager: EntityManager,
  lang: Lang,
): Promise<number> {
  return (await languageIds(manager)).idOf[lang];
}
