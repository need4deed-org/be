import { TRUTHY } from "../../config/constants";

// Model chosen in the be#1065 spike. Listed as `coming_soon` by Infomaniak
// but served normally; keep it overridable.
export const DEFAULT_TRANSLATION_MODEL = "mistralai/Mistral-Small-4-119B-2603";

export type TranslationProviderName = "infomaniak" | "fake";

export interface TranslationConfig {
  // Kill switch for everything outbound: while false the worker doesn't run
  // and no text leaves the server. enqueue still records pending rows.
  enabled: boolean;
  // Explicit TRANSLATION_PROVIDER, or undefined to pick automatically
  // (see createTranslationProvider).
  provider?: TranslationProviderName;
  productId?: string;
  token?: string;
  model: string;
  cronSchedule: string;
  // The Infomaniak product 429s at about 60 requests/minute.
  maxRequestsPerMinute: number;
  // Transient failures (429/5xx/timeout) before a row becomes failed.
  maxAttempts: number;
  timeoutMs: number;
}

function positiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

// Read on call, not at import, so tests can set the environment per case.
export function getTranslationConfig(
  env: Record<string, string | undefined> = process.env,
): TranslationConfig {
  return {
    enabled: TRUTHY.has(env.TRANSLATION_ENABLED ?? ""),
    provider:
      env.TRANSLATION_PROVIDER === "infomaniak" ||
      env.TRANSLATION_PROVIDER === "fake"
        ? env.TRANSLATION_PROVIDER
        : undefined,
    productId: env.INFOMANIAK_AI_PRODUCT_ID || undefined,
    token: env.INFOMANIAK_AI_TOKEN || undefined,
    model: env.INFOMANIAK_AI_MODEL || DEFAULT_TRANSLATION_MODEL,
    cronSchedule: env.CRON_SCHEDULE_TRANSLATION || "* * * * *",
    maxRequestsPerMinute: positiveInt(env.TRANSLATION_MAX_RPM, 45),
    maxAttempts: 5,
    timeoutMs: 20_000,
  };
}
