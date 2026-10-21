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
  LocalizedValue,
  renderEmail,
  resolveLocale,
} from "../email-template";
import { EmailSendError, SuspendedEmailError } from "../transports/validating";
import type { EmailTransport } from "../types";

const loader = createManifestLoader(emailCgcApplicationManifestUrl);
const formLoader = createFileLoader(cgcApplicationFormUrl, (file) =>
  file.subarray(0, 5).equals(Buffer.from("%PDF-")),
);

export function resetCgcApplicationTemplateCache(): void {
  loader.resetCache();
  formLoader.resetCache();
}

const TEAM_SIGNATURE: LocalizedValue = {
  [Lang.EN]: "The Need4Deed Team",
  [Lang.DE]: "Dein Need4Deed-Team",
};

const NO_NAME: LocalizedValue = {
  [Lang.EN]: "there",
  [Lang.DE]: "zusammen",
};

function pageUrls(page: string): LocalizedValue {
  return {
    [Lang.EN]: `${urlApp}/${Lang.EN}/${page}`,
    [Lang.DE]: `${urlApp}/${Lang.DE}/${page}`,
  };
}

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
      volunteerName: volunteerName.trim() || NO_NAME,
      signature: name ? `${name}, Need4Deed` : TEAM_SIGNATURE,
      communityEmail: emailFromCommunity,
      dataPrivacyUrl: pageUrls("data-privacy"),
      agreementUrl: pageUrls("agreement"),
    },
    locale,
    { escapeHtmlValues: true, fallbackLocale: Lang.EN },
  );

  try {
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
  } catch (err) {
    if (err instanceof SuspendedEmailError) {
      throw err;
    }
    throw new EmailSendError(err);
  }
}
