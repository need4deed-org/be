import { EmailTemplateName } from "need4deed-sdk";
import { emailFromNotify, emailFromVolunteer } from "../../../config/constants";
import { REGISTRATION_BUILTIN as BUILTIN } from "../builtin-content";
import { fillTemplate, resolveFlatContent } from "../email-template";
import { EMAIL_TEMPLATES, EmailTemplateVars } from "../email-templates";
import type { EmailTransport } from "../types";

const { loader } = EMAIL_TEMPLATES[EmailTemplateName.REGISTRATION];

export function resetRegistrationTemplateCache(): void {
  loader.resetCache();
}

export interface RegistrationEmailRecipient {
  email: string;
  name: string;
}

export async function sendEmailRegistration(
  email: EmailTransport,
  volunteer: RegistrationEmailRecipient,
): Promise<void> {
  const content = resolveFlatContent(await loader.load(), BUILTIN);
  const { subject, text, html } = fillTemplate(content, {
    volunteerName: volunteer.name,
  } satisfies EmailTemplateVars<EmailTemplateName.REGISTRATION>);

  await email.send({
    to: volunteer.email,
    cc: emailFromVolunteer,
    from: emailFromNotify,
    subject,
    ...(text !== undefined ? { text } : {}),
    ...(html !== undefined ? { html } : {}),
  });
}
