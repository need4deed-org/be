import { Lang } from "need4deed-sdk";
import { isTest } from "../../config/constants";
import { TranslationConfig } from "./config";
import { DOMAIN_TERMS, glossaryFor, loadReferenceGlossary } from "./glossary";
import { FakeProvider } from "./providers/fake";
import { InfomaniakProvider } from "./providers/infomaniak";
import {
  GlossaryEntry,
  TranslationErrorCode,
  TranslationProvider,
  TranslationUsage,
} from "./types";
import { validateTranslation } from "./validate";

export type FieldTranslationResult =
  | {
      status: "done";
      text: string;
      model: string;
      usage?: TranslationUsage;
    }
  | { status: "failed"; code: TranslationErrorCode }
  | {
      status: "retry";
      reason: "rate_limited" | "misconfigured" | "unavailable";
    };

const GLOSSARY_TTL_MS = 60 * 60 * 1000;

export class TranslationService {
  private glossary?: { entries: readonly GlossaryEntry[]; loadedAt: number };

  constructor(
    readonly provider: TranslationProvider,
    private readonly loadGlossary: () => Promise<
      readonly GlossaryEntry[]
    > = async () => [...DOMAIN_TERMS, ...(await loadReferenceGlossary())],
    private readonly now: () => number = Date.now,
  ) {}

  async translateField(
    text: string,
    targetLang: Lang,
  ): Promise<FieldTranslationResult> {
    const result = await this.provider.translate({
      text,
      targetLang,
      glossary: glossaryFor(text, await this.currentGlossary()),
    });

    if (result.status === "error") {
      return result.kind === "bad_response"
        ? { status: "failed", code: "bad_response" }
        : { status: "retry", reason: result.kind };
    }

    const validation = validateTranslation(text, result.text, targetLang);
    if (validation.status === "invalid") {
      return { status: "failed", code: validation.code };
    }
    return {
      status: "done",
      text: result.text.trim(),
      model: result.model,
      usage: result.usage,
    };
  }

  private async currentGlossary(): Promise<readonly GlossaryEntry[]> {
    if (
      !this.glossary ||
      this.now() - this.glossary.loadedAt > GLOSSARY_TTL_MS
    ) {
      this.glossary = {
        entries: await this.loadGlossary(),
        loadedAt: this.now(),
      };
    }
    return this.glossary.entries;
  }
}

export function createTranslationProvider(
  config: TranslationConfig,
  { allowNetwork = !isTest }: { allowNetwork?: boolean } = {},
): TranslationProvider | undefined {
  if (!allowNetwork || config.provider === "fake") {
    return new FakeProvider();
  }
  if (!config.productId || !config.token) {
    return undefined;
  }
  return new InfomaniakProvider({
    productId: config.productId,
    token: config.token,
    model: config.model,
    timeoutMs: config.timeoutMs,
  });
}
