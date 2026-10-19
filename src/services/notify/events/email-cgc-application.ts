import { Lang } from "need4deed-sdk";
import {
  cgcApplicationFormFileName,
  cgcApplicationFormUrl,
  emailCgcApplicationManifestUrl,
  emailFromCommunity,
  emailFromNotify,
  urlApp,
} from "../../../config/constants";
import { CGC_APPLICATION_BUILTIN as BUILTIN } from "../builtin-content";
import {
  createFileLoader,
  createManifestLoader,
  renderEmail,
  resolveLocale,
} from "../email-template";
import type { EmailTransport } from "../types";

const loader = createManifestLoader(emailCgcApplicationManifestUrl);
const formLoader = createFileLoader(cgcApplicationFormUrl);

export function resetCgcApplicationTemplateCache(): void {
  loader.resetCache();
  formLoader.resetCache();
}

const TEAM_SIGNATURE: Record<Lang, string> = {
  [Lang.EN]: "The Need4Deed Team",
  [Lang.DE]: "Dein Need4Deed-Team",
};

export interface CgcApplicationEmailInput {
  volunteerEmail: string;
  volunteerName: string;
  language?: string;
  coordinatorName?: string;
  coordinatorEmail?: string;
}

export async function sendEmailCgcApplication(
  email: EmailTransport,
  {
    volunteerEmail,
    volunteerName,
    language,
    coordinatorName,
    coordinatorEmail,
  }: CgcApplicationEmailInput,
): Promise<void> {
  const locale = resolveLocale(language, Lang.EN);
  const name = coordinatorName?.trim();
  const [form, manifest] = await Promise.all([
    formLoader.load(),
    loader.load(),
  ]);

  const { subject, text, html } = renderEmail(
    manifest,
    BUILTIN,
    {
      volunteerName,
      coordinatorName: name || TEAM_SIGNATURE[locale],
      signature: name ? `${name}\nNeed4Deed` : TEAM_SIGNATURE[locale],
      dataPrivacyUrl: `${urlApp}/${locale}/data-privacy`,
      agreementUrl: `${urlApp}/${locale}/agreement`,
    },
    locale,
    { escapeHtmlValues: true },
  );

  await email.send({
    to: volunteerEmail,
    cc: emailFromCommunity,
    replyTo: coordinatorEmail
      ? [coordinatorEmail, emailFromCommunity]
      : emailFromCommunity,
    from: emailFromNotify,
    subject,
    ...(text !== undefined ? { text } : {}),
    ...(html !== undefined ? { html } : {}),
    attachments: [
      {
        filename: cgcApplicationFormFileName,
        content: form,
        contentType: "application/pdf",
      },
    ],
  });
}
