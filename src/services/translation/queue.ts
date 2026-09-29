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

// The source text a translation was made from; a different hash means the
// translation is outdated.
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

/**
 * Queues machine translation of `fields` into every language other than the
 * entity's original one. Call it in the same transaction as the write that
 * changes the text, so text and source hash always change together.
 *
 * - unchanged text (same source hash) is left alone, whatever its state:
 *   done, failed, or a human translation;
 * - changed text resets the row to a pending machine translation, human
 *   rows included (epic decision 2: a translation of outdated text is worse
 *   than a fresh machine one);
 * - empty text removes the field's translations.
 *
 * No text leaves the server here; the worker does the translating.
 */
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

    // Translating into the original language is never wanted (be#1065:
    // same-language input comes back reworded).
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
  // The registry is generic over its tables; fields are read by name, and
  // machineEntry has already checked they belong to this table.
  const entity = (await manager.findOneBy(entry.entity, {
    id: entityId,
  })) as unknown as (TranslatableEntity & Record<string, unknown>) | null;
  if (!entity) {
    throw new Error(`${entityType} ${entityId} not found`);
  }
  return { entry, entity };
}

/**
 * Stores a person's translation of the field's current text (be#1070:
 * a write in a language other than the original). Kept until the source
 * text changes; then enqueue re-translates it.
 */
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

/**
 * A coordinator's correction of the language the text was typed in
 * (be#1070). The worker never changes it: model-based detection proved
 * unreliable (be#1065). Drops the translations into the new original
 * language and queues the ones now needed, including the previous one.
 */
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
