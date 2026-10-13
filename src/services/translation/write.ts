import { EntityTableName, Lang } from "need4deed-sdk";
import { EntityManager } from "typeorm";
import { BadRequestError } from "../../config";
import { languageIds, originalLang, TranslatableEntity } from "./languages";
import { setHuman } from "./queue";
import { resolve } from "./resolve";

type SourceEntity = TranslatableEntity & Record<string, unknown>;

const textOf = (value: unknown) => String(value ?? "").trim();

export async function writesOriginalLanguage(
  manager: EntityManager,
  entity: TranslatableEntity,
  lang: Lang,
): Promise<boolean> {
  const { langOf } = await languageIds(manager);
  return originalLang(entity, langOf) === lang;
}

export async function writeHumanTranslations(
  manager: EntityManager,
  entityType: EntityTableName,
  entity: TranslatableEntity,
  lang: Lang,
  fields: Record<string, string | null | undefined>,
): Promise<void> {
  const source = entity as SourceEntity;
  const submitted = Object.entries(fields).filter(
    (entry): entry is [string, string | null] => entry[1] !== undefined,
  );
  if (submitted.length === 0) {
    return;
  }
  const [served] = await resolve(
    manager,
    entityType,
    [{ ...source }],
    submitted.map(([fieldName]) => fieldName),
    lang,
  );

  const changed = submitted
    .map(([fieldName, value]) => [fieldName, textOf(value)] as const)
    .filter(([fieldName, text]) => text !== textOf(served[fieldName]));
  for (const [fieldName, text] of changed) {
    if (!text) {
      throw new BadRequestError(
        `${fieldName} can only be cleared in the original language.`,
      );
    }
    if (!textOf(source[fieldName])) {
      throw new BadRequestError(
        `${fieldName} has no original text to translate; edit it in the original language.`,
      );
    }
  }
  for (const [fieldName, text] of changed) {
    await setHuman(manager, entityType, entity.id, fieldName, lang, text);
  }
}
