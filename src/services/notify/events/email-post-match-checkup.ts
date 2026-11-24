import { EmailTemplateName } from "need4deed-sdk";
import { emailFromNotify, emailFromVolunteer } from "../../../config/constants";
import OpportunityVolunteer from "../../../data/entity/m2m/opportunity-volunteer";
import { POST_MATCH_CHECKUP_BUILTIN as BUILTIN } from "../builtin-content";
import { fillTemplate, resolveFlatContent } from "../email-template";
import { EMAIL_TEMPLATES, EmailTemplateVars } from "../email-templates";
import type { EmailTransport } from "../types";

const { loader } = EMAIL_TEMPLATES[EmailTemplateName.CHECKUP];

export function resetPostMatchCheckupTemplateCache(): void {
  loader.resetCache();
}

export async function sendEmailPostMatchCheckup(
  email: EmailTransport,
  ov: OpportunityVolunteer,
): Promise<void> {
  const volunteerEmail = ov.volunteer?.person?.email;
  if (!volunteerEmail) {
    throw new Error(
      `sendEmailPostMatchCheckup: missing email for volunteer ${ov.volunteerId}`,
    );
  }

  const volunteerName = ov.volunteer.person.name;
  const content = resolveFlatContent(await loader.load(), BUILTIN);
  const { subject, text, html } = fillTemplate(content, {
    volunteerName,
  } satisfies EmailTemplateVars<EmailTemplateName.CHECKUP>);

  await email.send({
    to: volunteerEmail,
    cc: emailFromVolunteer,
    from: emailFromNotify,
    subject,
    ...(text !== undefined ? { text } : {}),
    ...(html !== undefined ? { html } : {}),
  });
}
