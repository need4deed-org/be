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

export type Manifest = Partial<Record<Lang, LocaleContent>> | LocaleContent;

export type LocalizedValue = Record<Lang, string>;

export type TemplateVar = string | number | LocalizedValue | null | undefined;
export type TemplateVars = Record<string, TemplateVar>;

const DEFAULT_LOCALE = Lang.DE;

const PLACEHOLDER_RE = /\{\{\s*(\w+)(?:\.(\w+))?\s*\}\}/g;

function isLocalizedValue(value: TemplateVar): value is LocalizedValue {
  return typeof value === "object" && value !== null;
}

function isLang(value: string): value is Lang {
  return (Object.values(Lang) as string[]).includes(value);
}

type FillResult = { subject: string; html?: string; text?: string };

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}

function fill(
  content: LocaleContent,
  vars: TemplateVars,
  locale: Lang | undefined,
  escapeHtmlValues = false,
): { result: FillResult; ambiguous: string[] } {
  const ambiguous: string[] = [];
  const fillOne = (s: string, escape = false): string =>
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
        resolved = lang === undefined ? value : undefined;
      }
      if (resolved === undefined || resolved === null) {
        logger.warn(`email template: unresolved placeholder ${match}`);
        return match;
      }
      return escape ? escapeHtml(String(resolved)) : String(resolved);
    });

  return {
    result: {
      subject: fillOne(content.subject),
      ...(content.html !== undefined
        ? { html: fillOne(content.html, escapeHtmlValues) }
        : {}),
      ...(content.text !== undefined ? { text: fillOne(content.text) } : {}),
    },
    ambiguous,
  };
}

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

function isFlatContent(manifest: Manifest): manifest is LocaleContent {
  return typeof (manifest as LocaleContent).subject === "string";
}

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

export function renderEmail(
  manifest: Manifest | null,
  builtin: LocaleContent | Record<Lang, LocaleContent>,
  vars: TemplateVars,
  locale: Lang = DEFAULT_LOCALE,
  { escapeHtmlValues = false }: { escapeHtmlValues?: boolean } = {},
): FillResult {
  const pickBuiltin = (): { content: LocaleContent; lang?: Lang } =>
    isFlatBuiltin(builtin)
      ? { content: builtin }
      : pickContent(null, locale, builtin);

  const picked = isFlatBuiltin(builtin)
    ? { content: resolveFlatContent(manifest, builtin) }
    : pickContent(manifest, locale, builtin);

  const { result, ambiguous } = fill(
    picked.content,
    vars,
    picked.lang,
    escapeHtmlValues,
  );
  if (ambiguous.length === 0) {
    return result;
  }

  const fallback = pickBuiltin();
  if (fallback.content === picked.content) {
    logger.warn(
      `email builtin: no language for placeholder(s) ${formatKeys(ambiguous)}`,
    );
    return result;
  }
  logger.warn(
    `email manifest: no language for placeholder(s) ${formatKeys(
      ambiguous,
    )}, falling back to builtin`,
  );
  const fromBuiltin = fill(
    fallback.content,
    vars,
    fallback.lang,
    escapeHtmlValues,
  );
  if (fromBuiltin.ambiguous.length > 0) {
    logger.warn(
      `email builtin: no language for placeholder(s) ${formatKeys(
        fromBuiltin.ambiguous,
      )}`,
    );
  }
  return fromBuiltin.result;
}

function formatKeys(keys: string[]): string {
  return keys.map((k) => `{{${k}}}`).join(", ");
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
