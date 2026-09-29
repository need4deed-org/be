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

// Where the tag was made — decides the {{ where }} wording and the link.
export type TaggedWhere =
  | { kind: "post" }
  | { kind: "comment"; entityType?: EntityTableName; entityId?: number };

export interface EmailTaggedInput {
  recipient: { email: string; name?: string; language?: string };
  authorName?: string;
  // The comment/post text the tag is in.
  text: string;
  where: TaggedWhere;
}

const COMMENT_ON: Partial<Record<EntityTableName, keyof TaggedLabels>> = {
  [EntityTableName.VOLUNTEER]: "commentOnVolunteer",
  [EntityTableName.OPPORTUNITY]: "commentOnOpportunity",
  [EntityTableName.AGENT]: "commentOnAgent",
};

// A label per language: the manifest entry's own "labels" override, key by
// key, else the builtin's. renderEmail() then fills it in the language of
// the entry it lands in, so an entry and its labels always agree.
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

// fe dashboard routes of the cards a comment can sit on
// (fe src/app/[lang]/dashboard/<path>/[id]).
const CARD_PATH: Partial<Record<EntityTableName, string>> = {
  [EntityTableName.VOLUNTEER]: "volunteers",
  [EntityTableName.OPPORTUNITY]: "opportunities",
  [EntityTableName.AGENT]: "agents",
};

// The card for a comment, the Posts page for a post (fe has no link to a
// single post), the dashboard for anything else. Per language, since the fe
// route starts with it.
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

// User-entered text must not read as a template placeholder: the rendered
// email is checked for leftover {{ ... }} (ValidatingEmailTransport), and a
// comment that literally contains one would get the send suspended.
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
