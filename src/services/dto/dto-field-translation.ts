import { ApiFieldTranslation, TranslationErrorCode } from "need4deed-sdk";
import FieldTranslation from "../../data/entity/field_translation.entity";

export function dtoFieldTranslation(
  row: FieldTranslation,
): ApiFieldTranslation {
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
