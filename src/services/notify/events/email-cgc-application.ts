import { Lang } from "need4deed-sdk";
import {
  cgcApplicationFormFileName,
  cgcApplicationFormUrl,
  emailCgcApplicationManifestUrl,
  emailFromCommunity,
  emailFromNotify,
  emailTemplateFetchTimeoutMs,
  urlApp,
} from "../../../config/constants";
import { fetchFileFromUrl } from "../../../data/utils";
import { CGC_APPLICATION_BUILTIN as BUILTIN } from "../builtin-content";
import { createManifestLoader, renderEmail } from "../email-template";
import type { EmailTransport } from "../types";

const loader = createManifestLoader(emailCgcApplicationManifestUrl);

export function resetCgcApplicationTemplateCache(): void {
  loader.resetCache();
}

export interface CgcApplicationEmailInput {
  volunteerEmail: string;
  volunteerName: string;
  language?: string;
  coordinatorName: string;
}

function resolveCgcApplicationLocale(language: string | undefined): Lang {
  return language === Lang.DE ? Lang.DE : Lang.EN;
}

export async function sendEmailCgcApplication(
  email: EmailTransport,
  {
    volunteerEmail,
    volunteerName,
    language,
    coordinatorName,
  }: CgcApplicationEmailInput,
): Promise<void> {
  const locale = resolveCgcApplicationLocale(language);
  const form = await fetchFileFromUrl(
    cgcApplicationFormUrl,
    emailTemplateFetchTimeoutMs,
  );

  const { subject, text, html } = renderEmail(
    await loader.load(),
    BUILTIN,
    {
      volunteerName,
      coordinatorName,
      dataPrivacyUrl: `${urlApp}/${locale}/data-privacy`,
      agreementUrl: `${urlApp}/${locale}/agreement`,
    },
    locale,
    { escapeHtmlValues: true },
  );

  await email.send({
    to: volunteerEmail,
    cc: emailFromCommunity,
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
