import {
  ApiFieldTranslation,
  ApiFieldTranslationGet,
  Lang,
  TranslationErrorCode,
  TranslationOrigin,
  TranslationStatus,
} from "need4deed-sdk";
import { EntityManager, FindOptionsWhere } from "typeorm";
import { BadRequestError, NotFoundError } from "../../config";
import FieldTranslation from "../../data/entity/field_translation.entity";
import { languageIds, originalLang, TranslatableEntity } from "./languages";
import { translatedEntities, TranslatedEntityType } from "./registry";

export const reviewedEntityTypes = (
  Object.keys(translatedEntities) as TranslatedEntityType[]
).filter((entityType) => translatedEntities[entityType].machine);

const reviewedFks = reviewedEntityTypes.map(
  (entityType) => translatedEntities[entityType].fk,
);

export async function loadReviewedEntity(
  manager: EntityManager,
  entityType: TranslatedEntityType,
  entityId: number,
): Promise<TranslatableEntity & Record<string, unknown>> {
  const entity = await manager.findOneBy(
    translatedEntities[entityType].entity,
    {
      id: entityId,
    },
  );
  if (!entity) {
    throw new NotFoundError(`${entityType} (id:${entityId}) not found.`);
  }
  return entity as unknown as TranslatableEntity & Record<string, unknown>;
}

function dtoFieldTranslation(row: FieldTranslation): ApiFieldTranslation {
  return {
    id: row.id,
    text: row.translation,
    origin: row.origin,
    status: row.status,
    ...(row.lastErrorCode && {
      lastErrorCode: row.lastErrorCode as TranslationErrorCode,
    }),
  };
}

export async function getFieldTranslations(
  manager: EntityManager,
  entityType: TranslatedEntityType,
  entityId: number,
): Promise<ApiFieldTranslationGet[]> {
  const entity = await loadReviewedEntity(manager, entityType, entityId);
  const { fk, fields } = translatedEntities[entityType];
  const { langOf } = await languageIds(manager);
  const originalLanguage = originalLang(entity, langOf);
  const rows = await manager.find(FieldTranslation, {
    where: { [fk]: entityId } as FindOptionsWhere<FieldTranslation>,
    order: { id: "ASC" },
  });

  return fields
    .map((fieldName) => ({
      fieldName,
      original: String(entity[fieldName] ?? "").trim(),
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
  if (!row || !reviewedFks.some((fk) => Boolean(row[fk]))) {
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
  await manager.update(
    FieldTranslation,
    { id },
    { origin: TranslationOrigin.HUMAN },
  );
}
