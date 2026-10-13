import {
  ApiFieldTranslation,
  ApiFieldTranslationGet,
  Lang,
  TranslationOrigin,
  TranslationStatus,
} from "need4deed-sdk";
import { EntityManager, FindOptionsWhere } from "typeorm";
import { BadRequestError, ConflictError, NotFoundError } from "../../config";
import FieldTranslation from "../../data/entity/field_translation.entity";
import { dtoFieldTranslation } from "../dto/dto-field-translation";
import { languageIds, originalLang } from "./languages";
import { loadEntity, sourceHashOf, sourceTextOf } from "./queue";
import {
  machineEntityTypes,
  translatedEntities,
  TranslatedEntityType,
} from "./registry";

export async function getFieldTranslations(
  manager: EntityManager,
  entityType: TranslatedEntityType,
  entityId: number,
): Promise<ApiFieldTranslationGet[]> {
  const { entry, entity } = await loadEntity(manager, entityType, entityId, [
    ...translatedEntities[entityType].fields,
  ]);
  const { langOf } = await languageIds(manager);
  const originalLanguage = originalLang(entity, langOf);
  const rows = await manager.find(FieldTranslation, {
    where: { [entry.fk]: entityId } as FindOptionsWhere<FieldTranslation>,
    order: { id: "ASC" },
  });

  return entry.fields
    .map((fieldName) => ({
      fieldName,
      original: sourceTextOf(entity[fieldName]),
    }))
    .filter(({ original }) => original)
    .map(({ fieldName, original }) => {
      const translations: Partial<Record<Lang, ApiFieldTranslation>> = {};
      for (const row of rows) {
        const lang = langOf.get(row.languageId);
        if (row.fieldName === fieldName && lang && lang !== originalLanguage) {
          translations[lang] = dtoFieldTranslation(row);
        }
      }
      return { fieldName, original, originalLanguage, translations };
    });
}

export async function confirmTranslation(
  manager: EntityManager,
  id: number,
): Promise<void> {
  const row = await manager.findOneBy(FieldTranslation, { id });
  const entityType = machineEntityTypes.find(
    (type) => row?.[translatedEntities[type].fk],
  );
  if (!row || !entityType) {
    throw new NotFoundError(`Translation (id:${id}) not found.`);
  }
  if (row.origin === TranslationOrigin.HUMAN) {
    return;
  }
  if (row.status !== TranslationStatus.DONE || !row.translation) {
    throw new BadRequestError(
      `Translation (id:${id}) is ${row.status}; only a done translation can be confirmed.`,
    );
  }
  const { entity } = await loadEntity(
    manager,
    entityType,
    row[translatedEntities[entityType].fk] as number,
    [row.fieldName],
  );
  const sourceHash = sourceHashOf(sourceTextOf(entity[row.fieldName]));
  const { affected } = await manager.update(
    FieldTranslation,
    {
      id,
      origin: TranslationOrigin.MACHINE,
      status: TranslationStatus.DONE,
      sourceHash,
    },
    { origin: TranslationOrigin.HUMAN },
  );
  if (!affected) {
    throw new ConflictError(
      `Translation (id:${id}) no longer matches its original text; reload and review again.`,
    );
  }
}
