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
  // Transient: try again on a later run. rate_limited and misconfigured also
  // end the current run and don't count as an attempt of this row.
  | {
      status: "retry";
      reason: "rate_limited" | "misconfigured" | "unavailable";
    };

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
 * The engine for the worker, or undefined for a dry run.
 *
 * TRANSLATION_PROVIDER=fake (or NODE_ENV=test, where allowNetwork defaults
 * to false) gives the fake one; Infomaniak credentials give Infomaniak.
 * Without credentials there is no provider at all: never the fake one by
 * accident, whose "[<lang>] <text>" would be stored and served as real
 * translations. The worker then does a dry run: nothing is sent or
 * written, rows stay pending and readers get the original texts. Missing
 * translation settings never stop the server.
 */
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
