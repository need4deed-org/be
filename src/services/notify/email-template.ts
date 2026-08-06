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

// A manifest is either per-locale content keyed by "en"/"de", or a single flat
// LocaleContent used as-is regardless of locale (for content that isn't split
// by language, e.g. a template that already mixes both languages in one body).
export type Manifest = Partial<Record<Lang, LocaleContent>> | LocaleContent;
// null/undefined are legal values here (not just string | number) precisely
// because that's the failure mode fillTemplate() guards against — a caller
// computing a var that unexpectedly comes back nullish.
export type TemplateVars = Record<string, string | number | null | undefined>;

// Berlin-based NGO — when a recipient's locale can't be determined (e.g. a
// volunteer with no User row to read a language preference from), German is
// the more appropriate default than English.
const DEFAULT_LOCALE = Lang.DE;
// Captures an optional trailing "!" — {{ key! }} opts a placeholder into
// "required": a product owner can mark specific fields as load-bearing
// directly in the CDN manifest, without a code change. See fillTemplate().
const PLACEHOLDER_RE = /\{\{\s*(\w+)(!)?\s*\}\}/g;

/**
 * Replace all {{ key }} / {{ key! }} placeholders in the template content
 * with values from vars. Handles optional whitespace around keys.
 *
 * - A key genuinely absent from vars (not just nullish) is always left
 *   unresolved (the `{{ ... }}` stays in the output) and warned about — a
 *   template referencing a variable the caller never computes is always a
 *   code bug, `!` or not.
 * - A key present in vars but null/undefined:
 *   - without `!`: substituted with "" — most fields are legitimately
 *     optional, and a blank is better than the literal word "undefined".
 *   - with `!`: treated the same as unresolved (left in place, warned about)
 *     — this is the opt-in for fields that must never be blank.
 *
 * Never substring-matches rendered text for "undefined"/etc. — a user could
 * legitimately type that into free-text content (a title, a comment), and
 * that must never be flagged as invalid.
 */
export function fillTemplate(
  content: LocaleContent,
  vars: TemplateVars,
): { subject: string; html?: string; text?: string } {
  const fill = (s: string): string =>
    s.replace(PLACEHOLDER_RE, (match, key: string, required?: string) => {
      if (!(key in vars)) {
        logger.warn(`email template: unresolved placeholder {{${key}}}`);
        return match;
      }

      const value = vars[key];
      if (value === undefined || value === null) {
        if (required) {
          logger.warn(
            `email template: required placeholder {{${key}!}} resolved to ${value === null ? "null" : "undefined"}`,
          );
          return match;
        }
        return "";
      }

      return String(value);
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

// A flat manifest has a top-level "subject" — the per-locale shape never does,
// since its top-level keys are always locale codes ("en"/"de").
function isFlatContent(manifest: Manifest): manifest is LocaleContent {
  return typeof (manifest as LocaleContent).subject === "string";
}

export function resolveContent(
  manifest: Manifest | null,
  locale: Lang,
  builtin: Record<Lang, LocaleContent>,
): LocaleContent {
  if (manifest && isFlatContent(manifest)) {
    return isValid(manifest)
      ? manifest
      : (builtin[locale] ?? builtin[DEFAULT_LOCALE]);
  }
  const candidates = [manifest?.[locale], manifest?.[DEFAULT_LOCALE]];
  return candidates.find(isValid) ?? builtin[locale] ?? builtin[DEFAULT_LOCALE];
}

/**
 * Like resolveContent(), but for templates that were never split by
 * recipient locale in the first place — the manifest (or its fallback) is a
 * single flat LocaleContent used as-is, regardless of who's receiving it.
 * No locale to resolve, so there's nothing to guess wrong.
 */
export function resolveFlatContent(
  manifest: Manifest | null,
  builtin: LocaleContent,
): LocaleContent {
  return manifest && isFlatContent(manifest) && isValid(manifest)
    ? manifest
    : builtin;
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
