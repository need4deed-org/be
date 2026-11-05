import {
  ApiFieldTranslation,
  ApiFieldTranslationGet,
  ApiFieldTranslationPatch,
  ApiFieldTranslationPost,
  Lang,
  TranslatedEntityType,
  TranslationOrigin,
  TranslationStatus,
} from "need4deed-sdk";
import { EntityManager, FindOptionsWhere } from "typeorm";
import { BadRequestError, ConflictError, NotFoundError } from "../../config";
import FieldTranslation from "../../data/entity/field_translation.entity";
import { isUniqueViolation } from "../../data/utils";
import { dtoFieldTranslation } from "../dto/dto-field-translation";
import { languageIds, originalLang } from "./languages";
import { SourceEntity, sourceHashOf, sourceTextOf } from "./queue";
import { translatedEntities, translatedEntityTypes } from "./registry";

async function findEntity(
  manager: EntityManager,
  entityType: TranslatedEntityType,
  entityId: number,
  lock = false,
): Promise<SourceEntity> {
  const entity = (await manager.findOne(translatedEntities[entityType].entity, {
    where: { id: entityId },
    ...(lock && { lock: { mode: "pessimistic_write" as const } }),
  })) as unknown as SourceEntity | null;
  if (!entity) {
    throw new NotFoundError(`${entityType} (id:${entityId}) not found.`);
  }
  return entity;
}

function currentSource(
  entity: SourceEntity,
  fieldName: string,
  original: string,
): string {
  const current = sourceTextOf(entity[fieldName]);
  if (current !== sourceTextOf(original)) {
    throw new ConflictError(
      "The original text has changed; reload and review again.",
    );
  }
  return current;
}

function translationText(text: string): string {
  const translation = sourceTextOf(text);
  if (!translation) {
    throw new BadRequestError("A translation can't be empty.");
  }
  return translation;
}

export async function getFieldTranslations(
  manager: EntityManager,
  entityType: TranslatedEntityType,
  entityId: number,
): Promise<ApiFieldTranslationGet[]> {
  const entry = translatedEntities[entityType];
  const entity = await findEntity(manager, entityType, entityId);
  const { langOf } = await languageIds(manager);
  const originalLanguage = entry.machine
    ? originalLang(entity, langOf)
    : undefined;
  const rows = await manager.find(FieldTranslation, {
    where: { [entry.fk]: entityId } as FindOptionsWhere<FieldTranslation>,
    order: { id: "ASC" },
  });

  return entry.fields
    .map((fieldName) => ({
      fieldName,
      original: sourceTextOf(entity[fieldName]),
      fieldRows: rows.filter((row) => row.fieldName === fieldName),
    }))
    .filter(
      ({ original, fieldRows }) =>
        original || (!entry.machine && fieldRows.length > 0),
    )
    .map(({ fieldName, original, fieldRows }) => {
      const translations: Partial<Record<Lang, ApiFieldTranslation>> = {};
      for (const row of fieldRows) {
        const lang = langOf.get(row.languageId);
        if (lang && lang !== originalLanguage) {
          translations[lang] = dtoFieldTranslation(row);
        }
      }
      return {
        fieldName,
        original,
        ...(originalLanguage && { originalLanguage }),
        translations,
      };
    });
}

export async function createTranslation(
  manager: EntityManager,
  {
    entityType,
    entityId,
    fieldName,
    language,
    text,
    original,
  }: ApiFieldTranslationPost,
): Promise<ApiFieldTranslation> {
  const entry = translatedEntities[entityType];
  if (!(entry.fields as readonly string[]).includes(fieldName)) {
    throw new BadRequestError(`${entityType} has no translated ${fieldName}.`);
  }
  const translation = translationText(text);
  return manager.transaction(async (tx) => {
    const entity = await findEntity(tx, entityType, entityId, entry.machine);
    const { idOf, langOf } = await languageIds(tx);
    let source = null;
    if (entry.machine) {
      if (language === originalLang(entity, langOf)) {
        throw new BadRequestError(
          `${language} is the original language of ${entityType} (id:${entityId}).`,
        );
      }
      source = sourceHashOf(currentSource(entity, fieldName, original));
    }
    const repository = tx.getRepository(FieldTranslation);
    try {
      const { identifiers } = await repository.insert({
        [entry.fk]: entityId,
        fieldName,
        languageId: idOf[language],
        origin: entry.machine
          ? TranslationOrigin.HUMAN
          : TranslationOrigin.REFERENCE,
        status: TranslationStatus.DONE,
        translation,
        sourceHash: source,
        attempts: 0,
        lastErrorCode: null,
        model: null,
      } as Partial<FieldTranslation>);
      return dtoFieldTranslation(
        await repository.findOneByOrFail({ id: identifiers[0].id }),
      );
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictError(
          `${entityType} (id:${entityId}) already has a ${language} ${fieldName}; edit it with PATCH /translation/{id}.`,
        );
      }
      throw error;
    }
  });
}

export async function editTranslation(
  manager: EntityManager,
  id: number,
  { text, original }: ApiFieldTranslationPatch,
): Promise<ApiFieldTranslation> {
  const translation = translationText(text);
  return manager.transaction(async (tx) => {
    const row = await tx.findOneBy(FieldTranslation, { id });
    const entityType = translatedEntityTypes.find(
      (type) => row?.[translatedEntities[type].fk],
    );
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
    const entity = await findEntity(
      tx,
      entityType,
      row[entry.fk] as number,
      true,
    );
    const human = {
      ...done,
      origin: TranslationOrigin.HUMAN,
      sourceHash: sourceHashOf(currentSource(entity, row.fieldName, original)),
      model: null,
    };
    await tx.update(FieldTranslation, { id }, human);
    return dtoFieldTranslation({ ...row, ...human });
  });
}
