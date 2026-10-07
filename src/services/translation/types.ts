import { Lang } from "need4deed-sdk";

export interface GlossaryEntry {
  de: string;
  en: string;
}

export interface TranslationRequest {
  text: string;
  targetLang: Lang;
  glossary: readonly GlossaryEntry[];
}

export interface TranslationUsage {
  promptTokens: number;
  completionTokens: number;
}

export type ProviderResult =
  | {
      status: "ok";
      text: string;
      model: string;
      usage?: TranslationUsage;
    }
  | {
      status: "error";
      kind: "rate_limited" | "misconfigured" | "unavailable" | "bad_response";
    };

export interface TranslationProvider {
  readonly name: string;
  translate(request: TranslationRequest): Promise<ProviderResult>;
}

export type TranslationErrorCode =
  | "empty"
  | "length_ratio"
  | "token_missing"
  | "untranslated"
  | "source_is_target"
  | "wrong_language"
  | "bad_response"
  | "provider_unavailable";
