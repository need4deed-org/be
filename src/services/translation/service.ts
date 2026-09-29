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
  // Not worth retrying: the provider's answer was unusable or failed
  // validation (outputs vary, but the same input tends to fail the same way).
  | { status: "failed"; code: TranslationErrorCode }
  // Transient: try again on a later run, and stop the current run early
  // when rate limited.
  | { status: "retry"; reason: "rate_limited" | "unavailable" };

const GLOSSARY_TTL_MS = 60 * 60 * 1000;

/**
 * The one place that knows how a field gets translated: glossary, provider
 * call, error classification and output validation. The worker only deals
 * with the queue, so another engine is a new TranslationProvider and a
 * TRANSLATION_PROVIDER value.
 */
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

/**
 * TRANSLATION_PROVIDER picks the engine explicitly. Without it: Infomaniak
 * when its product id and token are set, otherwise the fake one. Under
 * NODE_ENV=test it's always the fake one (allowNetwork defaults to false), so
 * tests never touch the network.
 */
export function createTranslationProvider(
  config: TranslationConfig,
  { allowNetwork = !isTest }: { allowNetwork?: boolean } = {},
): TranslationProvider {
  const choice =
    config.provider ??
    (config.productId && config.token ? "infomaniak" : "fake");

  if (choice === "fake" || !allowNetwork) {
    return new FakeProvider();
  }
  if (!config.productId || !config.token) {
    throw new Error(
      "TRANSLATION_PROVIDER=infomaniak needs INFOMANIAK_AI_PRODUCT_ID and INFOMANIAK_AI_TOKEN",
    );
  }
  return new InfomaniakProvider({
    productId: config.productId,
    token: config.token,
    model: config.model,
    timeoutMs: config.timeoutMs,
  });
}
