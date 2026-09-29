import { EntityTableName, Lang, TranslationStatus } from "need4deed-sdk";
import { EntityManager, FindOptionsWhere, In } from "typeorm";
import FieldTranslation from "../../data/entity/field_translation.entity";
import { languageIds, originalLang, TranslatableEntity } from "./languages";
import { sourceHashOf } from "./queue";
import { getMachineEntry } from "./registry";

/**
 * Shows `entities` in `lang` (be#1064 decision 5): for each entity whose
 * original language differs, overlays the listed fields in place with their
 * done translation (machine or human). Anything else keeps the original:
 * pending, failed or missing translations, and translations of an older
 * version of the text. Runs before the DTO, so response shapes don't change;
 * one query for all entities, and it never calls the provider.
 */
export async function resolve<E extends TranslatableEntity>(
  manager: EntityManager,
  entityType: EntityTableName,
  entities: E[],
  fields: string[],
  lang: Lang,
): Promise<E[]> {
  const { fk } = getMachineEntry(entityType, fields);
  const { idOf, langOf } = await languageIds(manager);
  const foreign = entities.filter(
    (entity) => originalLang(entity, langOf) !== lang,
  );
  if (foreign.length === 0) {
    return entities;
  }

  const rows = await manager.find(FieldTranslation, {
    where: {
      [fk]: In(foreign.map(({ id }) => id)),
      fieldName: In(fields),
      languageId: idOf[lang],
      status: TranslationStatus.DONE,
    } as FindOptionsWhere<FieldTranslation>,
  });
  const byKey = new Map(
    rows.map((row) => [`${row[fk]}:${row.fieldName}`, row]),
  );

  for (const entity of foreign) {
    const record = entity as unknown as Record<string, unknown>;
    for (const field of fields) {
      const row = byKey.get(`${entity.id}:${field}`);
      const current = record[field];
      if (
        row?.translation &&
        typeof current === "string" &&
        row.sourceHash === sourceHashOf(current.trim())
      ) {
        record[field] = row.translation;
      }
    }
  }
  return entities;
}
