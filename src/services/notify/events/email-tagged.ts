import { EntityTableName, Lang } from "need4deed-sdk";
import {
  emailFromNotify,
  emailTaggedManifestUrl,
  urlApp,
} from "../../../config/constants";
import { TAGGED_BUILTIN as BUILTIN } from "../builtin-content";
import {
  createManifestLoader,
  renderEmail,
  resolveLocale,
  type LocalizedValue,
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

const COMMENT_ON: Partial<Record<EntityTableName, LocalizedValue>> = {
  [EntityTableName.VOLUNTEER]: {
    [Lang.EN]: "a comment on a volunteer",
    [Lang.DE]: "einem Kommentar zu einer freiwilligen Person",
  },
  [EntityTableName.OPPORTUNITY]: {
    [Lang.EN]: "a comment on an opportunity",
    [Lang.DE]: "einem Kommentar zu einem Gesuch",
  },
  [EntityTableName.AGENT]: {
    [Lang.EN]: "a comment on an organisation",
    [Lang.DE]: "einem Kommentar zu einer Einrichtung",
  },
};
const COMMENT: LocalizedValue = {
  [Lang.EN]: "a comment",
  [Lang.DE]: "einem Kommentar",
};
const POST: LocalizedValue = {
  [Lang.EN]: "a post",
  [Lang.DE]: "einem Beitrag",
};
const SOMEONE: LocalizedValue = { [Lang.EN]: "Someone", [Lang.DE]: "Jemand" };
const NO_NAME: LocalizedValue = { [Lang.EN]: "there", [Lang.DE]: "zusammen" };

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

function describeWhere(where: TaggedWhere): LocalizedValue {
  if (where.kind === "post") {
    return POST;
  }
  return (where.entityType && COMMENT_ON[where.entityType]) ?? COMMENT;
}

// User-entered text must not read as a template placeholder: the rendered
// email is checked for leftover {{ ... }} (ValidatingEmailTransport), and a
// comment that literally contains one would get the send suspended.
function neutralizeBraces(value: string): string {
  return value.replace(/\{\{/g, "{​{").replace(/\}\}/g, "}​}");
}

export async function sendEmailTagged(
  email: EmailTransport,
  { recipient, authorName, text, where }: EmailTaggedInput,
): Promise<void> {
  if (!recipient.email) {
    throw new Error("sendEmailTagged: missing recipient email");
  }

  const {
    subject,
    text: body,
    html,
  } = renderEmail(
    await loader.load(),
    BUILTIN,
    {
      recipientName: recipient.name
        ? neutralizeBraces(recipient.name)
        : NO_NAME,
      authorName: authorName ? neutralizeBraces(authorName) : SOMEONE,
      tagText: neutralizeBraces(text),
      where: describeWhere(where),
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
