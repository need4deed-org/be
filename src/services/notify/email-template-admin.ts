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
import { fetchFileFromUrl } from "../../data/utils";
import logger from "../../logger";
import { getCdnStorage } from "../cdn-storage";
import { LocaleContent, Manifest, placeholdersIn } from "./email-template";
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

async function readStored(
  definition: EmailTemplateDefinition,
): Promise<StoredTemplate> {
  const storage = getCdnStorage();
  const raw = storage
    ? await storage.read(definition.storageKey)
    : (
        await fetchFileFromUrl(definition.url, emailTemplateFetchTimeoutMs)
      ).toString("utf-8");
  return { raw, manifest: raw ? (JSON.parse(raw) as Manifest) : null };
}

function versionOf(raw: string | null): string {
  return createHash("sha256")
    .update(raw ?? "")
    .digest("hex");
}

function isFlat(manifest: Manifest): manifest is ContentWithLabels {
  return typeof (manifest as LocaleContent).subject === "string";
}

function builtinFor(
  definition: EmailTemplateDefinition,
  lang: Lang,
): ContentWithLabels {
  const { builtin } = definition;
  return typeof (builtin as LocaleContent).subject === "string"
    ? (builtin as LocaleContent)
    : (builtin as Record<Lang, ContentWithLabels>)[lang];
}

function toText(
  definition: EmailTemplateDefinition,
  stored: ContentWithLabels | undefined,
  fallback: ContentWithLabels,
): ApiEmailTemplateText {
  const subject = stored?.subject || fallback.subject;
  const text = stored?.text || fallback.text || "";
  if (definition.labelKeys.length === 0) {
    return { subject, text };
  }
  const labels = Object.fromEntries(
    definition.labelKeys.map((key) => {
      const value = stored?.labels?.[key];
      return [
        key,
        typeof value === "string" && value.trim()
          ? value
          : String(fallback.labels?.[key] ?? ""),
      ];
    }),
  );
  return { subject, text, labels };
}

function toApiContent(
  definition: EmailTemplateDefinition,
  manifest: Manifest | null,
): ApiEmailTemplateContent {
  const builtinIsFlat =
    typeof (definition.builtin as LocaleContent).subject === "string";
  if (manifest ? isFlat(manifest) : builtinIsFlat) {
    return {
      layout: EmailTemplateLayout.SINGLE,
      content: toText(
        definition,
        (manifest as ContentWithLabels | null) ?? undefined,
        builtinFor(definition, Lang.DE),
      ),
    };
  }
  const perLanguage = manifest as Partial<
    Record<Lang, ContentWithLabels>
  > | null;
  return {
    layout: EmailTemplateLayout.PER_LANGUAGE,
    content: Object.fromEntries(
      LANGS.map((lang) => [
        lang,
        toText(definition, perLanguage?.[lang], builtinFor(definition, lang)),
      ]),
    ) as Record<Lang, ApiEmailTemplateText>,
  };
}

function hasHtml(manifest: Manifest | null): boolean {
  if (!manifest) {
    return false;
  }
  return isFlat(manifest)
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
  return isFlat(manifest)
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
      .flatMap(({ subject, text }) =>
        placeholdersIn(`${subject}\n${text ?? ""}`).map(({ key }) => key),
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
  const isUnknown = ({ key, lang }: { key: string; lang?: string }) =>
    !allowed.has(key) ||
    (lang !== undefined && !(LANGS as string[]).includes(lang));
  const unknown = [
    ...placeholdersIn(`${subject}\n${text}`).filter(isUnknown),
    ...Object.values(labels).flatMap(placeholdersIn),
  ].map(({ key, lang }) => (lang ? `${key}.${lang}` : key));
  if (unknown.length > 0) {
    return {
      code: "unknown_placeholder",
      message: `Unknown placeholder(s): ${[...new Set(unknown)].join(", ")}.`,
      placeholders: [...new Set(unknown)],
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
    const problem = problemsOf(definition, required, text);
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

export async function saveEmailTemplate(
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
