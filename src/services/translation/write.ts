import { EntityTableName, Lang } from "need4deed-sdk";
import { EntityManager } from "typeorm";
import { BadRequestError } from "../../config";
import { languageIds, originalLang, TranslatableEntity } from "./languages";
import { SourceEntity, sourceTextOf, storeHuman } from "./queue";
import { getMachineEntry } from "./registry";
import { resolve } from "./resolve";

export async function writeHumanTranslations(
  manager: EntityManager,
  entityType: EntityTableName,
  entity: TranslatableEntity,
  lang: Lang,
  fields: Record<string, string | null | undefined>,
): Promise<boolean> {
  const source = entity as SourceEntity;
  const { idOf, langOf } = await languageIds(manager);
  if (lang === originalLang(source, langOf)) {
    return false;
  }
  const submitted = Object.entries(fields).filter(
    (entry): entry is [string, string | null] => entry[1] !== undefined,
  );
  if (submitted.length === 0) {
    return true;
  }
  const fieldNames = submitted.map(([fieldName]) => fieldName);
  const { fk } = getMachineEntry(entityType, fieldNames);
  const [served] = await resolve(
    manager,
    entityType,
    [{ ...source }],
    fieldNames,
    lang,
  );

  const changed = submitted
    .map(([fieldName, value]) => [fieldName, sourceTextOf(value)] as const)
    .filter(
      ([fieldName, text]) =>
        text !== sourceTextOf(served[fieldName]) &&
        text !== sourceTextOf(source[fieldName]),
    );
  for (const [fieldName, text] of changed) {
    if (!text) {
      throw new BadRequestError(
        `${fieldName} can only be cleared in the original language.`,
      );
    }
    if (!sourceTextOf(source[fieldName])) {
      throw new BadRequestError(
        `${fieldName} has no original text to translate; edit it in the original language.`,
      );
    }
  }
  for (const [fieldName, text] of changed) {
    await storeHuman(manager, fk, source, idOf[lang], fieldName, text);
  }
  return true;
}
