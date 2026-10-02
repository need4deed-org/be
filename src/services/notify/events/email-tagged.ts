import { EntityTableName, Lang } from "need4deed-sdk";
import {
  emailFromNotify,
  emailTaggedManifestUrl,
  urlApp,
} from "../../../config/constants";
import {
  TAGGED_BUILTIN as BUILTIN,
  type TaggedLabels,
} from "../builtin-content";
import {
  createManifestLoader,
  renderEmail,
  resolveLocale,
  type LocalizedValue,
  type Manifest,
} from "../email-template";
import type { EmailTransport } from "../types";

const loader = createManifestLoader(emailTaggedManifestUrl);

export function resetTaggedTemplateCache(): void {
  loader.resetCache();
}

export type TaggedWhere =
  | { kind: "post" }
  | { kind: "comment"; entityType?: EntityTableName; entityId?: number };

export interface EmailTaggedInput {
  recipient: { email: string; name?: string; language?: string };
  authorName?: string;
  text: string;
  where: TaggedWhere;
}

const COMMENT_ON: Partial<Record<EntityTableName, keyof TaggedLabels>> = {
  [EntityTableName.VOLUNTEER]: "commentOnVolunteer",
  [EntityTableName.OPPORTUNITY]: "commentOnOpportunity",
  [EntityTableName.AGENT]: "commentOnAgent",
};

function resolveLabel(
  manifest: Manifest | null,
  key: keyof TaggedLabels,
): LocalizedValue {
  const pick = (lang: Lang): string => {
    const entry = (manifest as Record<string, unknown> | null)?.[lang] as
      | { labels?: Record<string, unknown> }
      | undefined;
    const override = entry?.labels?.[key];
    return typeof override === "string" && override.trim()
      ? override
      : BUILTIN[lang].labels[key];
  };
  return { [Lang.EN]: pick(Lang.EN), [Lang.DE]: pick(Lang.DE) };
}

const CARD_PATH: Partial<Record<EntityTableName, string>> = {
  [EntityTableName.VOLUNTEER]: "volunteers",
  [EntityTableName.OPPORTUNITY]: "opportunities",
  [EntityTableName.AGENT]: "agents",
};

export function buildTaggedLink(where: TaggedWhere): LocalizedValue {
  let path = "dashboard";
  if (where.kind === "post") {
    path = "dashboard/posts";
  } else {
    const card = where.entityType && CARD_PATH[where.entityType];
    if (card && where.entityId) {
      path = `dashboard/${card}/${where.entityId}`;
    }
  }
  return {
    [Lang.EN]: `${urlApp}/${Lang.EN}/${path}`,
    [Lang.DE]: `${urlApp}/${Lang.DE}/${path}`,
  };
}

function whereLabel(where: TaggedWhere): keyof TaggedLabels {
  if (where.kind === "post") {
    return "post";
  }
  return (
    (where.entityType ? COMMENT_ON[where.entityType] : undefined) ?? "comment"
  );
}

function neutralizeBraces(value: string): string {
  return value.replace(/\{\{/g, "{\u200B{").replace(/\}\}/g, "}\u200B}");
}

export async function sendEmailTagged(
  email: EmailTransport,
  { recipient, authorName, text, where }: EmailTaggedInput,
): Promise<void> {
  if (!recipient.email) {
    throw new Error("sendEmailTagged: missing recipient email");
  }

  const manifest = await loader.load();
  const {
    subject,
    text: body,
    html,
  } = renderEmail(
    manifest,
    BUILTIN,
    {
      recipientName: recipient.name
        ? neutralizeBraces(recipient.name)
        : resolveLabel(manifest, "noName"),
      authorName: authorName
        ? neutralizeBraces(authorName)
        : resolveLabel(manifest, "someone"),
      tagText: neutralizeBraces(text),
      where: resolveLabel(manifest, whereLabel(where)),
      link: buildTaggedLink(where),
    },
    resolveLocale(recipient.language),
    { escapeHtmlValues: true },
  );

  await email.send({
    to: recipient.email,
    from: emailFromNotify,
    subject,
    ...(body !== undefined ? { text: body } : {}),
    ...(html !== undefined ? { html } : {}),
  });
}
