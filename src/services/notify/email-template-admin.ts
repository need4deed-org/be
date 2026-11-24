import { createHash } from "node:crypto";
import {
  ApiEmailTemplateContent,
  ApiEmailTemplateGet,
  ApiEmailTemplateListItem,
  ApiEmailTemplatePlaceholder,
  ApiEmailTemplatePut,
  ApiEmailTemplateSaveError,
  ApiEmailTemplateText,
  EmailTemplateLayout,
  EmailTemplateName,
  Lang,
} from "need4deed-sdk";
import {
  BadRequestError,
  emailTemplateFetchTimeoutMs,
  EmailTemplateSaveError,
} from "../../config";
import logger from "../../logger";
import { getCdnStorage } from "../cdn-storage";
import {
  isFlatBuiltin,
  isFlatContent,
  isValidContent,
  LocaleContent,
  malformedPlaceholdersIn,
  Manifest,
  placeholdersIn,
} from "./email-template";
import {
  builtinContentsOf,
  EMAIL_NOTE_PLACEHOLDER,
  EMAIL_TEMPLATES,
  EmailTemplateDefinition,
} from "./email-templates";

type ContentWithLabels = LocaleContent & { labels?: Record<string, unknown> };

interface StoredTemplate {
  raw: string | null;
  manifest: Manifest | null;
}

const LANGS = Object.values(Lang);

export function isEmailTemplateEditable(): boolean {
  return getCdnStorage() !== null;
}

async function readFromCdn(url: string): Promise<string | null> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(emailTemplateFetchTimeoutMs),
  });
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`fetch ${url} failed (${response.status})`);
  }
  return response.text();
}

function parseManifest(name: EmailTemplateName, raw: string): Manifest | null {
  let manifest: unknown = null;
  try {
    manifest = JSON.parse(raw);
  } catch {
    manifest = null;
  }
  if (typeof manifest === "object" && manifest !== null) {
    return manifest as Manifest;
  }
  logger.warn(`email template "${name}": stored file is not a JSON object`);
  return null;
}

async function readStored(
  definition: EmailTemplateDefinition,
): Promise<StoredTemplate> {
  const storage = getCdnStorage();
  const raw = storage
    ? await storage.read(definition.storageKey)
    : await readFromCdn(definition.url);
  return {
    raw,
    manifest: raw === null ? null : parseManifest(definition.name, raw),
  };
}

function versionOf(raw: string | null): string {
  return createHash("sha256")
    .update(raw ?? "")
    .digest("hex");
}

function builtinFor(
  definition: EmailTemplateDefinition,
  lang: Lang,
): ContentWithLabels {
  const { builtin } = definition;
  return isFlatBuiltin(builtin)
    ? builtin
    : (builtin[lang] as ContentWithLabels);
}

function toText(
  definition: EmailTemplateDefinition,
  content: ContentWithLabels,
  labelSource: ContentWithLabels | undefined,
  builtin: ContentWithLabels,
): ApiEmailTemplateText {
  const { subject } = content;
  const text = content.text || builtin.text || "";
  if (definition.labelKeys.length === 0) {
    return { subject, text };
  }
  const labels = Object.fromEntries(
    definition.labelKeys.map((key) => {
      const value = labelSource?.labels?.[key];
      return [
        key,
        typeof value === "string" && value.trim()
          ? value
          : String(builtin.labels?.[key] ?? ""),
      ];
    }),
  );
  return { subject, text, labels };
}

function sentContent(
  definition: EmailTemplateDefinition,
  stored: Partial<Record<Lang, ContentWithLabels>> | null,
  lang: Lang,
): ContentWithLabels {
  const own = stored?.[lang];
  if (isValidContent(own)) {
    return own;
  }
  const fallback = stored?.[definition.fallbackLocale];
  return isValidContent(fallback) ? fallback : builtinFor(definition, lang);
}

function toApiContent(
  definition: EmailTemplateDefinition,
  manifest: Manifest | null,
): ApiEmailTemplateContent {
  const flat = manifest
    ? isFlatContent(manifest)
    : isFlatBuiltin(definition.builtin);
  if (flat) {
    const builtin = builtinFor(definition, Lang.DE);
    const stored = manifest as ContentWithLabels | null;
    return {
      layout: EmailTemplateLayout.SINGLE,
      content: toText(
        definition,
        isValidContent(stored ?? undefined)
          ? (stored as ContentWithLabels)
          : builtin,
        stored ?? undefined,
        builtin,
      ),
    };
  }
  const stored = manifest as Partial<Record<Lang, ContentWithLabels>> | null;
  return {
    layout: EmailTemplateLayout.PER_LANGUAGE,
    content: Object.fromEntries(
      LANGS.map((lang) => [
        lang,
        toText(
          definition,
          sentContent(definition, stored, lang),
          stored?.[lang],
          builtinFor(definition, lang),
        ),
      ]),
    ) as Record<Lang, ApiEmailTemplateText>,
  };
}

function hasHtml(manifest: Manifest | null): boolean {
  if (!manifest) {
    return false;
  }
  return isFlatContent(manifest)
    ? Boolean(manifest.html)
    : LANGS.some((lang) => Boolean(manifest[lang]?.html));
}

function storedContents(
  definition: EmailTemplateDefinition,
  manifest: Manifest | null,
): LocaleContent[] {
  if (!manifest) {
    return builtinContentsOf(definition.name);
  }
  return isFlatContent(manifest)
    ? [manifest]
    : LANGS.flatMap((lang) => manifest[lang] ?? []);
}

function requiredPlaceholders(
  definition: EmailTemplateDefinition,
  manifest: Manifest | null,
): Set<string> {
  const allowed = new Set(definition.placeholders);
  return new Set(
    storedContents(definition, manifest)
      .flatMap(({ subject, text, html }) =>
        placeholdersIn(`${subject}\n${text ?? ""}\n${html ?? ""}`).map(
          ({ key }) => key,
        ),
      )
      .filter((key) => key !== EMAIL_NOTE_PLACEHOLDER && allowed.has(key)),
  );
}

function placeholdersOf(
  definition: EmailTemplateDefinition,
  manifest: Manifest | null,
): ApiEmailTemplatePlaceholder[] {
  const required = requiredPlaceholders(definition, manifest);
  return definition.placeholders.map((name) => ({
    name,
    required: required.has(name),
  }));
}

function toGet(
  definition: EmailTemplateDefinition,
  stored: StoredTemplate,
): ApiEmailTemplateGet {
  return {
    name: definition.name,
    editable: isEmailTemplateEditable(),
    version: versionOf(stored.raw),
    template: toApiContent(definition, stored.manifest),
    placeholders: placeholdersOf(definition, stored.manifest),
    labelKeys: definition.labelKeys,
    hasHtml: hasHtml(stored.manifest),
  };
}

export async function listEmailTemplates(): Promise<
  ApiEmailTemplateListItem[]
> {
  return Promise.all(
    Object.values(EMAIL_TEMPLATES).map(async (definition) => ({
      name: definition.name,
      layout: toApiContent(definition, (await readStored(definition)).manifest)
        .layout,
    })),
  );
}

export async function getEmailTemplate(
  name: EmailTemplateName,
): Promise<ApiEmailTemplateGet> {
  const definition = EMAIL_TEMPLATES[name];
  return toGet(definition, await readStored(definition));
}

function isText(value: unknown): value is ApiEmailTemplateText {
  const text = value as ApiEmailTemplateText | null;
  return (
    typeof text === "object" &&
    text !== null &&
    typeof text.subject === "string" &&
    typeof text.text === "string" &&
    (text.labels === undefined ||
      (typeof text.labels === "object" &&
        text.labels !== null &&
        Object.values(text.labels).every((v) => typeof v === "string")))
  );
}

function textsOf(
  template: ApiEmailTemplateContent,
): { lang?: Lang; text: ApiEmailTemplateText }[] {
  if (template.layout === EmailTemplateLayout.SINGLE) {
    if (!isText(template.content)) {
      throw new BadRequestError("Template content is malformed.");
    }
    return [{ text: template.content }];
  }
  if (template.layout !== EmailTemplateLayout.PER_LANGUAGE) {
    throw new BadRequestError("Unknown template layout.");
  }
  const content = template.content as Partial<Record<Lang, unknown>> | null;
  return LANGS.map((lang) => {
    const text = content?.[lang];
    if (!isText(text)) {
      throw new BadRequestError(`Template content for "${lang}" is malformed.`);
    }
    return { lang, text };
  });
}

function problemsOf(
  definition: EmailTemplateDefinition,
  required: Set<string>,
  { subject, text, labels = {} }: ApiEmailTemplateText,
  languageOpen: boolean,
): Omit<ApiEmailTemplateSaveError, "lang"> | null {
  const blank = [
    ...(subject.trim() ? [] : (["subject"] as const)),
    ...(text.trim() ? [] : (["text"] as const)),
    ...Object.entries(labels)
      .filter(([, value]) => !value.trim())
      .map(([key]) => `labels.${key}` as const),
  ];
  if (blank.length > 0) {
    return {
      code: "blank_field",
      message: "Fill in every field.",
      fields: blank,
    };
  }

  const unknownLabels = Object.keys(labels).filter(
    (key) => !definition.labelKeys.includes(key),
  );
  if (unknownLabels.length > 0) {
    return {
      code: "unknown_label",
      message: `Unknown label(s): ${unknownLabels.join(", ")}.`,
      fields: unknownLabels.map((key) => `labels.${key}` as const),
    };
  }

  const allowed = new Set(definition.placeholders);
  const localized = new Set(definition.localizedPlaceholders);
  const isUnknown = ({ key, lang }: { key: string; lang?: string }) =>
    !allowed.has(key) ||
    (lang !== undefined &&
      (!localized.has(key) || !(LANGS as string[]).includes(lang)));
  const needsLanguage = ({ key, lang }: { key: string; lang?: string }) =>
    languageOpen &&
    lang === undefined &&
    localized.has(key) &&
    key !== EMAIL_NOTE_PLACEHOLDER;
  const body = `${subject}\n${text}`;
  const unknown = [
    ...placeholdersIn(body)
      .filter(isUnknown)
      .map(({ key, lang }) => (lang ? `${key}.${lang}` : key)),
    ...malformedPlaceholdersIn(body),
    ...Object.values(labels).flatMap(
      (label) => label.match(/\{\{[^{}]*\}\}/g) ?? [],
    ),
  ];
  if (unknown.length > 0) {
    return {
      code: "unknown_placeholder",
      message: `Unknown placeholder(s): ${[...new Set(unknown)].join(", ")}.`,
      placeholders: [...new Set(unknown)],
    };
  }

  const withoutLanguage = [
    ...new Set(
      placeholdersIn(body)
        .filter(needsLanguage)
        .map(({ key }) => key),
    ),
  ];
  if (withoutLanguage.length > 0) {
    return {
      code: "unknown_placeholder",
      message: `Placeholder(s) ${withoutLanguage.join(", ")} need a language here, e.g. {{ ${withoutLanguage[0]}.de }}.`,
      placeholders: withoutLanguage,
    };
  }

  const used = new Set(
    placeholdersIn(`${subject}\n${text}`).map(({ key }) => key),
  );
  const missing = [...required].filter((key) => !used.has(key));
  if (missing.length > 0) {
    return {
      code: "missing_placeholder",
      message: `Missing placeholder(s): ${missing.join(", ")}.`,
      placeholders: missing,
    };
  }
  return null;
}

function validate(
  definition: EmailTemplateDefinition,
  current: Manifest | null,
  template: ApiEmailTemplateContent,
): { lang?: Lang; text: ApiEmailTemplateText }[] {
  const texts = textsOf(template);
  const required = requiredPlaceholders(definition, current);
  for (const { lang, text } of texts) {
    const problem = problemsOf(
      definition,
      required,
      text,
      lang === undefined && !definition.knowsRecipientLocale,
    );
    if (problem) {
      throw new EmailTemplateSaveError({
        ...problem,
        ...(lang ? { lang } : {}),
      });
    }
  }
  return texts;
}

function toStoredContent({
  subject,
  text,
  labels,
}: ApiEmailTemplateText): ContentWithLabels {
  return {
    subject,
    text,
    ...(labels && Object.keys(labels).length > 0 ? { labels } : {}),
  };
}

function toManifest(
  texts: { lang?: Lang; text: ApiEmailTemplateText }[],
): Manifest {
  const [first] = texts;
  if (texts.length === 1 && first.lang === undefined) {
    return toStoredContent(first.text);
  }
  return Object.fromEntries(
    texts.map(({ lang, text }) => [lang, toStoredContent(text)]),
  ) as Manifest;
}

function historyKey(name: EmailTemplateName, at: Date): string {
  return `emails/_history/${name}/${at.toISOString().replace(/[:.]/g, "-")}.json`;
}

const pendingSaves = new Map<EmailTemplateName, Promise<unknown>>();

function oneAtATime<T>(
  name: EmailTemplateName,
  task: () => Promise<T>,
): Promise<T> {
  const run = (pendingSaves.get(name) ?? Promise.resolve())
    .catch(() => undefined)
    .then(task);
  pendingSaves.set(name, run);
  return run;
}

export function saveEmailTemplate(
  name: EmailTemplateName,
  put: ApiEmailTemplatePut,
  userId: number,
): Promise<ApiEmailTemplateGet> {
  return oneAtATime(name, () => save(name, put, userId));
}

async function save(
  name: EmailTemplateName,
  { version, template }: ApiEmailTemplatePut,
  userId: number,
): Promise<ApiEmailTemplateGet> {
  const storage = getCdnStorage();
  if (!storage) {
    throw new EmailTemplateSaveError({
      code: "not_editable",
      message: "Email templates can't be saved in this environment.",
    });
  }
  const definition = EMAIL_TEMPLATES[name];
  const current = await readStored(definition);
  if (versionOf(current.raw) !== version) {
    throw new EmailTemplateSaveError({
      code: "version_conflict",
      message: "The template was changed in the meantime. Reload it first.",
    });
  }

  const manifest = toManifest(validate(definition, current.manifest, template));
  const raw = `${JSON.stringify(manifest, null, 2)}\n`;
  if (current.raw !== null) {
    await storage.write(
      historyKey(name, new Date()),
      current.raw,
      "application/json",
    );
  }
  await storage.write(definition.storageKey, raw, "application/json");
  definition.loader.prime(manifest);
  logger.info(`email template "${name}" saved by user ${userId}`);

  return toGet(definition, { raw, manifest });
}
