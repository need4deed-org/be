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
// A translatable value, one string per language — see fillTemplate() for how
// a placeholder picks the right one.
export type LocalizedValue = Record<Lang, string>;
// null/undefined are legal values here (not just string | number) precisely
// because that's the failure mode fillTemplate() guards against — a caller
// computing a var that unexpectedly comes back nullish.
export type TemplateVar = string | number | LocalizedValue | null | undefined;
export type TemplateVars = Record<string, TemplateVar>;

// Berlin-based NGO — when a recipient's locale can't be determined (e.g. a
// volunteer with no User row to read a language preference from), German is
// the more appropriate default than English.
const DEFAULT_LOCALE = Lang.DE;
// {{ key }}, or {{ key.en }} / {{ key.de }} to pick one language of a
// LocalizedValue explicitly.
const PLACEHOLDER_RE = /\{\{\s*(\w+)(?:\.(\w+))?\s*\}\}/g;

function isLocalizedValue(value: TemplateVar): value is LocalizedValue {
  return typeof value === "object" && value !== null;
}

function isLang(value: string): value is Lang {
  return (Object.values(Lang) as string[]).includes(value);
}

type FillResult = { subject: string; html?: string; text?: string };

// Shared by fillTemplate() and renderEmail(): also reports the placeholders
// that point at a LocalizedValue but can't tell which language to use, so
// renderEmail() can fall back to the builtin instead of sending them.
function fill(
  content: LocaleContent,
  vars: TemplateVars,
  locale: Lang | undefined,
): { result: FillResult; ambiguous: string[] } {
  const ambiguous: string[] = [];
  const fillOne = (s: string): string =>
    s.replace(PLACEHOLDER_RE, (match, key: string, lang?: string) => {
      const value = key in vars ? vars[key] : undefined;
      let resolved: string | number | null | undefined;
      if (isLocalizedValue(value)) {
        const pick = lang ?? locale;
        if (pick === undefined) {
          ambiguous.push(key);
          return match;
        }
        resolved = isLang(pick) ? value[pick] : undefined;
      } else {
        // {{ key.en }} on a plain value is a template/caller mismatch.
        resolved = lang === undefined ? value : undefined;
      }
      if (resolved === undefined || resolved === null) {
        logger.warn(`email template: unresolved placeholder ${match}`);
        return match;
      }
      return String(resolved);
    });

  return {
    result: {
      subject: fillOne(content.subject),
      ...(content.html !== undefined ? { html: fillOne(content.html) } : {}),
      ...(content.text !== undefined ? { text: fillOne(content.text) } : {}),
    },
    ambiguous,
  };
}

/**
 * Replace all {{ key }} placeholders in the template content with values
 * from vars. Handles optional whitespace around keys. Every placeholder must
 * resolve to a real value — a key genuinely absent from vars, or present but
 * null/undefined, is left unresolved (the `{{ ... }}` stays in the output)
 * and warned about, so a template/caller mismatch always surfaces rather
 * than silently rendering blank.
 *
 * A LocalizedValue var resolves by `{{ key.en }}` / `{{ key.de }}`, or by a
 * plain `{{ key }}` when `locale` (the language of the content) is given.
 * A plain `{{ key }}` with no `locale` can't pick a language and stays
 * unresolved — use renderEmail() to fall back to the builtin instead.
 *
 * Never substring-matches rendered text for "undefined"/etc. — a user could
 * legitimately type that into free-text content (a title, a comment), and
 * that must never be flagged as invalid.
 */
export function fillTemplate(
  content: LocaleContent,
  vars: TemplateVars,
  locale?: Lang,
): FillResult {
  const { result, ambiguous } = fill(content, vars, locale);
  for (const key of ambiguous) {
    logger.warn(`email template: no language for placeholder {{${key}}}`);
  }
  return result;
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

// resolveContent()'s pick, plus the language of the picked content —
// undefined for flat content, which has no single language.
function pickContent(
  manifest: Manifest | null,
  locale: Lang,
  builtin: Record<Lang, LocaleContent>,
): { content: LocaleContent; lang?: Lang } {
  const fromBuiltin = (): { content: LocaleContent; lang: Lang } =>
    builtin[locale]
      ? { content: builtin[locale], lang: locale }
      : { content: builtin[DEFAULT_LOCALE], lang: DEFAULT_LOCALE };

  if (manifest && isFlatContent(manifest)) {
    return isValid(manifest) ? { content: manifest } : fromBuiltin();
  }
  for (const lang of [locale, DEFAULT_LOCALE]) {
    const content = manifest?.[lang];
    if (isValid(content)) {
      return { content, lang };
    }
  }
  return fromBuiltin();
}

export function resolveContent(
  manifest: Manifest | null,
  locale: Lang,
  builtin: Record<Lang, LocaleContent>,
): LocaleContent {
  return pickContent(manifest, locale, builtin).content;
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

function isFlatBuiltin(
  builtin: LocaleContent | Record<Lang, LocaleContent>,
): builtin is LocaleContent {
  return typeof (builtin as LocaleContent).subject === "string";
}

/**
 * Pick the content (as resolveContent()/resolveFlatContent() do, by the
 * builtin's shape) and fill it. Each LocalizedValue resolves in the language
 * of the content it lands in: the locale of a per-locale entry, or the
 * explicit `{{ key.en }}` / `{{ key.de }}` in a flat bilingual body.
 *
 * A manifest that leaves the language of a LocalizedValue open (a plain
 * `{{ key }}` in a flat body) is treated like an invalid manifest: the
 * builtin is rendered instead, which is kept correct in code.
 */
export function renderEmail(
  manifest: Manifest | null,
  builtin: LocaleContent | Record<Lang, LocaleContent>,
  vars: TemplateVars,
  locale: Lang = DEFAULT_LOCALE,
): FillResult {
  const pickBuiltin = (): { content: LocaleContent; lang?: Lang } =>
    isFlatBuiltin(builtin)
      ? { content: builtin }
      : pickContent(null, locale, builtin);

  const picked = isFlatBuiltin(builtin)
    ? { content: resolveFlatContent(manifest, builtin) }
    : pickContent(manifest, locale, builtin);

  const { result, ambiguous } = fill(picked.content, vars, picked.lang);
  if (ambiguous.length === 0) {
    return result;
  }

  const fallback = pickBuiltin();
  if (fallback.content === picked.content) {
    // The builtin itself is ambiguous — leave the placeholders unresolved so
    // ValidatingEmailTransport suspends the send and reports it.
    return fillTemplate(picked.content, vars, picked.lang);
  }
  logger.warn(
    `email manifest: no language for placeholder(s) ${ambiguous
      .map((k) => `{{${k}}}`)
      .join(", ")}, falling back to builtin`,
  );
  return fillTemplate(fallback.content, vars, fallback.lang);
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
