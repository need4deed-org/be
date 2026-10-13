import { Lang, TranslationOrigin, TranslationStatus } from "need4deed-sdk";
import { reviewedEntityTypes } from "../../services/translation/review";

export const translationEntityParamSchema = {
  type: "object",
  required: ["entityType", "entityId"],
  properties: {
    entityType: { type: "string", enum: reviewedEntityTypes },
    entityId: { type: "integer", minimum: 1 },
  },
};

export const originalLanguageBodySchema = {
  type: "object",
  required: ["language"],
  additionalProperties: false,
  properties: {
    language: { type: "string", enum: Object.values(Lang) },
  },
};

const fieldTranslationSchema = {
  type: "object",
  required: ["id", "text", "origin", "status"],
  properties: {
    id: { type: "integer" },
    text: { type: ["string", "null"] },
    origin: { type: "string", enum: Object.values(TranslationOrigin) },
    status: { type: "string", enum: Object.values(TranslationStatus) },
    lastErrorCode: { type: "string" },
  },
};

export const fieldTranslationsResponseSchema = {
  type: "object",
  required: ["message", "data"],
  properties: {
    message: { type: "string" },
    data: {
      type: "array",
      items: {
        type: "object",
        required: ["fieldName", "original", "translations"],
        properties: {
          fieldName: { type: "string" },
          original: { type: "string" },
          originalLanguage: { type: "string", enum: Object.values(Lang) },
          translations: {
            type: "object",
            properties: Object.fromEntries(
              Object.values(Lang).map((lang) => [lang, fieldTranslationSchema]),
            ),
          },
        },
      },
    },
  },
};
