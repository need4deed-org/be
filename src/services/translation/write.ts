import { EntityTableName, Lang } from "need4deed-sdk";
import { EntityManager } from "typeorm";
import { BadRequestError } from "../../config";
import { languageIds, originalLang, TranslatableEntity } from "./languages";
import { setHuman } from "./queue";
import { resolve } from "./resolve";

export async function writesOriginalLanguage(
  manager: EntityManager,
  entity: TranslatableEntity,
  lang: Lang,
): Promise<boolean> {
  if (!entity.originalLanguageId) {
    return true;
  }
  const { langOf } = await languageIds(manager);
  return originalLang(entity, langOf) === lang;
}

export async function writeHumanTranslations<E extends TranslatableEntity>(
  manager: EntityManager,
  entityType: EntityTableName,
  entity: E,
  lang: Lang,
  fields: Record<string, string | null | undefined>,
): Promise<void> {
  const submitted = Object.entries(fields).filter(
    (entry): entry is [string, string | null] => entry[1] !== undefined,
  );
  if (submitted.length === 0) {
    return;
  }
  const [served] = await resolve(
    manager,
    entityType,
    [{ ...entity }],
    submitted.map(([fieldName]) => fieldName),
    lang,
  );

  for (const [fieldName, value] of submitted) {
    const text = value?.trim() ?? "";
    const current = (served as unknown as Record<string, unknown>)[fieldName];
    if (text === String(current ?? "").trim()) {
      continue;
    }
    if (!text) {
      throw new BadRequestError(
        `${fieldName} can only be cleared in the original language.`,
      );
    }
    await setHuman(manager, entityType, entity.id, fieldName, lang, text);
  }
}
