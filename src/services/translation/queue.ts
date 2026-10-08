import {
  EntityTableName,
  Lang,
  TranslationOrigin,
  TranslationStatus,
} from "need4deed-sdk";
import { EntityManager, FindOptionsWhere } from "typeorm";
import FieldTranslation from "../../data/entity/field_translation.entity";
import { sha256Hex } from "../../data/utils/hash-token";
import { languageIds, originalLang, TranslatableEntity } from "./languages";
import {
  getMachineEntry,
  getTranslatedEntity,
  TranslationFk,
} from "./registry";

export function sourceHashOf(text: string): string {
  return sha256Hex(text);
}

function rowsOf(
  fk: TranslationFk,
  entityId: number,
  extra: FindOptionsWhere<FieldTranslation> = {},
): FindOptionsWhere<FieldTranslation> {
  return { [fk]: entityId, ...extra } as FindOptionsWhere<FieldTranslation>;
}

export async function enqueue(
  manager: EntityManager,
  entityType: EntityTableName,
  entity: TranslatableEntity,
  fields: Record<string, string | null | undefined>,
): Promise<void> {
  const { fk } = getMachineEntry(entityType, Object.keys(fields));
  const { idOf, langOf } = await languageIds(manager);
  const original = originalLang(entity, langOf);
  const repository = manager.getRepository(FieldTranslation);

  for (const [fieldName, value] of Object.entries(fields)) {
    const text = value?.trim();
    if (!text) {
      await repository.delete(rowsOf(fk, entity.id, { fieldName }));
      continue;
    }
    const sourceHash = sourceHashOf(text);

    await repository.delete(
      rowsOf(fk, entity.id, { fieldName, languageId: idOf[original] }),
    );

    for (const lang of Object.values(Lang)) {
      if (lang === original) {
        continue;
      }
      const where = rowsOf(fk, entity.id, {
        fieldName,
        languageId: idOf[lang],
      });
      const existing = await repository.findOneBy(where);
      if (existing?.sourceHash === sourceHash) {
        continue;
      }
      const pending = {
        origin: TranslationOrigin.MACHINE,
        status: TranslationStatus.PENDING,
        sourceHash,
        translation: null,
        attempts: 0,
        lastErrorCode: null,
        model: null,
      };
      if (existing) {
        await repository.update({ id: existing.id }, pending);
      } else {
        await repository.insert({
          ...where,
          ...pending,
        } as Partial<FieldTranslation>);
      }
    }
  }
}

async function loadEntity(
  manager: EntityManager,
  entityType: EntityTableName,
  entityId: number,
  fieldNames: string[],
) {
  const entry = getMachineEntry(entityType, fieldNames);
  const entity = (await manager.findOneBy(entry.entity, {
    id: entityId,
  })) as unknown as (TranslatableEntity & Record<string, unknown>) | null;
  if (!entity) {
    throw new Error(`${entityType} ${entityId} not found`);
  }
  return { entry, entity };
}

export async function setHuman(
  manager: EntityManager,
  entityType: EntityTableName,
  entityId: number,
  fieldName: string,
  lang: Lang,
  text: string,
): Promise<void> {
  const { entry, entity } = await loadEntity(manager, entityType, entityId, [
    fieldName,
  ]);
  const { idOf, langOf } = await languageIds(manager);
  if (lang === originalLang(entity, langOf)) {
    throw new Error(
      `${lang} is the original language of ${entityType} ${entityId}`,
    );
  }
  const source = String(entity[fieldName] ?? "").trim();
  const where = rowsOf(entry.fk, entityId, {
    fieldName,
    languageId: idOf[lang],
  });
  const human = {
    origin: TranslationOrigin.HUMAN,
    status: TranslationStatus.DONE,
    translation: text.trim(),
    sourceHash: sourceHashOf(source),
    attempts: 0,
    lastErrorCode: null,
    model: null,
  };

  const repository = manager.getRepository(FieldTranslation);
  const existing = await repository.findOneBy(where);
  if (existing) {
    await repository.update({ id: existing.id }, human);
  } else {
    await repository.insert({
      ...where,
      ...human,
    } as Partial<FieldTranslation>);
  }
}

export async function setOriginalLanguage(
  manager: EntityManager,
  entityType: EntityTableName,
  entityId: number,
  lang: Lang,
): Promise<void> {
  const fieldNames = [...getTranslatedEntity(entityType).fields];
  const { entry, entity } = await loadEntity(
    manager,
    entityType,
    entityId,
    fieldNames,
  );
  const { idOf, langOf } = await languageIds(manager);
  if (originalLang(entity, langOf) === lang && entity.originalLanguageId) {
    return;
  }

  await manager.update(
    entry.entity,
    { id: entityId },
    { originalLanguageId: idOf[lang] },
  );
  await manager
    .getRepository(FieldTranslation)
    .delete(rowsOf(entry.fk, entityId, { languageId: idOf[lang] }));

  await enqueue(
    manager,
    entityType,
    { id: entityId, originalLanguageId: idOf[lang] },
    Object.fromEntries(
      fieldNames.map((field) => [field, entity[field] as string | null]),
    ),
  );
}
