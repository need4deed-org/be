import {
  ApiFieldTranslation,
  ApiFieldTranslationGet,
  ApiFieldTranslationPatch,
  Lang,
  TranslationOrigin,
  TranslationStatus,
} from "need4deed-sdk";
import { EntityManager, FindOptionsWhere } from "typeorm";
import { BadRequestError, ConflictError, NotFoundError } from "../../config";
import FieldTranslation from "../../data/entity/field_translation.entity";
import { dtoFieldTranslation } from "../dto/dto-field-translation";
import { languageIds, originalLang } from "./languages";
import { loadEntity, SourceEntity, sourceHashOf, sourceTextOf } from "./queue";
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

export async function editTranslation(
  manager: EntityManager,
  id: number,
  { text, original }: ApiFieldTranslationPatch,
): Promise<ApiFieldTranslation> {
  const translation = sourceTextOf(text);
  if (!translation) {
    throw new BadRequestError("A translation can't be empty.");
  }
  return manager.transaction(async (tx) => {
    const row = await tx.findOneBy(FieldTranslation, { id });
    const entityType = (
      Object.keys(translatedEntities) as TranslatedEntityType[]
    ).find((type) => row?.[translatedEntities[type].fk]);
    if (!row || !entityType) {
      throw new NotFoundError(`Translation (id:${id}) not found.`);
    }
    const entry = translatedEntities[entityType];
    const done = {
      translation,
      status: TranslationStatus.DONE,
      attempts: 0,
      lastErrorCode: null,
    };
    if (!entry.machine) {
      await tx.update(FieldTranslation, { id }, done);
      return dtoFieldTranslation({ ...row, ...done });
    }
    const entity = (await tx.findOne(entry.entity, {
      where: { id: row[entry.fk] as number },
      lock: { mode: "pessimistic_write" },
    })) as unknown as SourceEntity | null;
    const current = sourceTextOf(entity?.[row.fieldName]);
    if (!entity || current !== sourceTextOf(original)) {
      throw new ConflictError(
        `Translation (id:${id}) no longer matches its original text; reload and review again.`,
      );
    }
    const human = {
      ...done,
      origin: TranslationOrigin.HUMAN,
      sourceHash: sourceHashOf(current),
      model: null,
    };
    await tx.update(FieldTranslation, { id }, human);
    return dtoFieldTranslation({ ...row, ...human });
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
