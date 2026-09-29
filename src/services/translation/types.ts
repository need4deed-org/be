import { Lang } from "need4deed-sdk";

// A German/English term pair the model must render consistently (seeded
// reference titles plus domain terms, see be#1067 design E).
export interface GlossaryEntry {
  de: string;
  en: string;
}

// One field per call: batching made the model mix items up (be#1065).
export interface TranslationRequest {
  text: string;
  targetLang: Lang;
  glossary: readonly GlossaryEntry[];
}

export interface TranslationUsage {
  promptTokens: number;
  completionTokens: number;
}

// String discriminants, not a boolean: narrowing `{ ok: true } | { ok: false }`
// is unreliable in this repo's tsc version.
export type ProviderResult =
  | {
      status: "ok";
      text: string;
      model: string;
      usage?: TranslationUsage;
    }
  | {
      status: "error";
      // rate_limited / unavailable: transient, retried on a later run.
      // bad_response: the provider answered but not with a usable result.
      kind: "rate_limited" | "unavailable" | "bad_response";
    };

export interface TranslationProvider {
  readonly name: string;
  translate(request: TranslationRequest): Promise<ProviderResult>;
}

// field_translation.last_error_code values. Codes only, never text.
export type TranslationErrorCode =
  | "empty"
  | "length_ratio"
  | "token_missing"
  | "untranslated"
  | "source_is_target"
  | "wrong_language"
  | "bad_response"
  | "provider_unavailable";
