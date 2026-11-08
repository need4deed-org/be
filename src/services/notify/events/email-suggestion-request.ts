import { EntityTableName, Lang } from "need4deed-sdk";
import {
  emailFromNotify,
  emailSuggestionRequestManifestUrl,
} from "../../../config/constants";
import {
  SUGGESTION_REQUEST_BUILTIN as BUILTIN,
  type SuggestionRequestLabels,
} from "../builtin-content";
import {
  createManifestLoader,
  renderEmail,
  resolveLocale,
  type LocalizedValue,
  type Manifest,
} from "../email-template";
import type { EmailTransport } from "../types";
import { buildTaggedLink, neutralizeBraces } from "./email-tagged";

const loader = createManifestLoader(emailSuggestionRequestManifestUrl);

export function resetSuggestionRequestTemplateCache(): void {
  loader.resetCache();
}

export interface EmailSuggestionRequestInput {
  recipient: { email: string; name?: string; language?: string };
  requesterName?: string;
  requesterAgent: string;
  volunteerId: number;
  volunteerName: string;
  opportunityTitle: string;
}

function resolveLabel(
  manifest: Manifest | null,
  key: keyof SuggestionRequestLabels,
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

export async function sendEmailSuggestionRequest(
  email: EmailTransport,
  {
    recipient,
    requesterName,
    requesterAgent,
    volunteerId,
    volunteerName,
    opportunityTitle,
  }: EmailSuggestionRequestInput,
): Promise<void> {
  if (!recipient.email) {
    throw new Error("sendEmailSuggestionRequest: missing recipient email");
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
      requesterName: requesterName
        ? neutralizeBraces(requesterName)
        : resolveLabel(manifest, "someone"),
      requesterAgent: neutralizeBraces(requesterAgent),
      volunteerName: neutralizeBraces(volunteerName),
      opportunityTitle: neutralizeBraces(opportunityTitle),
      link: buildTaggedLink({
        kind: "comment",
        entityType: EntityTableName.VOLUNTEER,
        entityId: volunteerId,
      }),
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
