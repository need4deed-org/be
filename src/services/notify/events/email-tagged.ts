import { EntityTableName, Lang } from "need4deed-sdk";
import {
  emailFromNotify,
  emailTaggedManifestUrl,
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

// Where the tag was made — decides the {{ where }} wording.
export type TaggedWhere =
  | { kind: "post" }
  | { kind: "comment"; entityType?: EntityTableName };

export interface EmailTaggedInput {
  recipient: { email: string; name?: string; language?: string };
  authorName?: string;
  // The comment/post text the tag is in.
  text: string;
  where: TaggedWhere;
  // Link to the card or the Posts page, per language (the fe route carries
  // the language, e.g. /en/dashboard/...).
  link: LocalizedValue;
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
  { recipient, authorName, text, where, link }: EmailTaggedInput,
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
      link,
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
