import { Lang } from "need4deed-sdk";
import {
  emailTemplateFetchTimeoutMs,
  emailTemplateTtlMs,
} from "../../config/constants";
import { fetchJsonFromUrl } from "../../data/utils";
import logger from "../../logger";

export interface LocaleContent {
  subject: string;
  html?: string;
  text?: string;
}

export type Manifest = Partial<Record<Lang, LocaleContent>>;
export type TemplateVars = Record<string, string | number>;

const DEFAULT_LOCALE = Lang.EN;
const PLACEHOLDER_RE = /\{\{\s*(\w+)\s*\}\}/g;

/**
 * Replace all {{ key }} placeholders in the template content with values from
 * vars. Handles optional whitespace around keys. Each placeholder that has no
 * matching key in vars is left unchanged and a warning is logged so template
 * mismatches surface early.
 */
export function fillTemplate(
  content: LocaleContent,
  vars: TemplateVars,
): { subject: string; html?: string; text?: string } {
  const fill = (s: string): string =>
    s.replace(PLACEHOLDER_RE, (match, key: string) => {
      if (!(key in vars)) {
        logger.warn(`email template: unresolved placeholder {{${key}}}`);
        return match;
      }
      return String(vars[key]);
    });

  return {
    subject: fill(content.subject),
    ...(content.html !== undefined ? { html: fill(content.html) } : {}),
    ...(content.text !== undefined ? { text: fill(content.text) } : {}),
  };
}

export function resolveLocale(language: string | undefined): Lang {
  return language === Lang.DE
    ? Lang.DE
    : language === Lang.EN
      ? Lang.EN
      : DEFAULT_LOCALE;
}

function isValid(content: LocaleContent | undefined): content is LocaleContent {
  return Boolean(content?.subject && (content.html || content.text));
}

export function resolveContent(
  manifest: Manifest | null,
  locale: Lang,
  builtin: Record<Lang, LocaleContent>,
): LocaleContent {
  const candidates = [manifest?.[locale], manifest?.[DEFAULT_LOCALE]];
  return candidates.find(isValid) ?? builtin[locale] ?? builtin[DEFAULT_LOCALE];
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}

/**
 * Returns a cached CDN manifest loader bound to a specific URL. Each email
 * type creates its own loader; they share the same TTL/timeout config but keep
 * separate caches. resetCache() is exposed for test isolation.
 */
export function createManifestLoader(url: string): {
  load(): Promise<Manifest | null>;
  resetCache(): void;
} {
  let cache: { value: Manifest; expires: number } | null = null;

  return {
    resetCache() {
      cache = null;
    },
    async load(): Promise<Manifest | null> {
      const now = Date.now();
      if (cache && now < cache.expires) {
        return cache.value;
      }
      try {
        const value = (await withTimeout(
          fetchJsonFromUrl(url),
          emailTemplateFetchTimeoutMs,
        )) as Manifest;
        cache = { value, expires: now + emailTemplateTtlMs };
        return value;
      } catch (err) {
        logger.warn(
          `email manifest fetch failed (${url}): ${err instanceof Error ? err.message : err}`,
        );
        return cache?.value ?? null;
      }
    },
  };
}
