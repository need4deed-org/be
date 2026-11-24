import { EmailTemplateName, EntityTableName } from "need4deed-sdk";
import { emailFromNotify } from "../../../config/constants";
import {
  SUGGESTION_REQUEST_BUILTIN as BUILTIN,
  type SuggestionRequestLabels,
} from "../builtin-content";
import {
  renderEmail,
  resolveLocale,
  resolveManifestLabel,
  type LocalizedValue,
  type Manifest,
} from "../email-template";
import { EMAIL_TEMPLATES, EmailTemplateVars } from "../email-templates";
import { opportunityTitleIn, type TitleSource } from "../opportunity-title";
import type { EmailTransport } from "../types";
import { buildTaggedLink, neutralizeBraces } from "./email-tagged";

const { loader } = EMAIL_TEMPLATES[EmailTemplateName.SUGGESTION_REQUEST];

export function resetSuggestionRequestTemplateCache(): void {
  loader.resetCache();
}

export interface EmailSuggestionRequestInput {
  recipient: { email: string; name?: string; language?: string };
  requesterName?: string;
  requesterAgent: string;
  volunteerId: number;
  volunteerName: string;
  opportunity: TitleSource;
}

const resolveLabel = (
  manifest: Manifest | null,
  key: keyof SuggestionRequestLabels,
): LocalizedValue => resolveManifestLabel(manifest, BUILTIN, key);

export async function sendEmailSuggestionRequest(
  email: EmailTransport,
  {
    recipient,
    requesterName,
    requesterAgent,
    volunteerId,
    volunteerName,
    opportunity,
  }: EmailSuggestionRequestInput,
): Promise<void> {
  if (!recipient.email) {
    throw new Error("sendEmailSuggestionRequest: missing recipient email");
  }

  const locale = resolveLocale(recipient.language);
  const title = await opportunityTitleIn(opportunity, locale);
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
      opportunityTitle: neutralizeBraces(title),
      link: buildTaggedLink({
        kind: "comment",
        entityType: EntityTableName.VOLUNTEER,
        entityId: volunteerId,
      }),
    } satisfies EmailTemplateVars<EmailTemplateName.SUGGESTION_REQUEST>,
    locale,
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
