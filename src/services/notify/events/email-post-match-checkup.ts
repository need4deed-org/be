import {
  emailFromNotify,
  emailFromVolunteer,
  emailPostMatchCheckupManifestUrl,
} from "../../../config/constants";
import OpportunityVolunteer from "../../../data/entity/m2m/opportunity-volunteer";
import { POST_MATCH_CHECKUP_BUILTIN as BUILTIN } from "../builtin-content";
import {
  createManifestLoader,
  fillTemplate,
  resolveContent,
  resolveLocale,
} from "../email-template";
import type { EmailTransport } from "../types";

const loader = createManifestLoader(emailPostMatchCheckupManifestUrl);

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
  const locale = resolveLocale(ov.volunteer.person?.users?.[0]?.language);
  const content = resolveContent(await loader.load(), locale, BUILTIN);
  const { subject, text, html } = fillTemplate(content, { volunteerName });

  await email.send({
    to: volunteerEmail,
    cc: emailFromVolunteer,
    from: emailFromNotify,
    subject,
    ...(text !== undefined ? { text } : {}),
    ...(html !== undefined ? { html } : {}),
  });
}
