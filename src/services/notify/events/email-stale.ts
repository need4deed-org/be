import {
  emailFromNotify,
  emailFromVolunteer,
  emailStaleManifestUrl,
} from "../../../config/constants";
import OpportunityVolunteer from "../../../data/entity/m2m/opportunity-volunteer";
import { STALE_BUILTIN as BUILTIN } from "../builtin-content";
import {
  createManifestLoader,
  fillTemplate,
  resolveContent,
  resolveLocale,
} from "../email-template";
import type { EmailTransport } from "../types";

const loader = createManifestLoader(emailStaleManifestUrl);

export function resetStaleTemplateCache(): void {
  loader.resetCache();
}

export async function sendEmailStale(
  email: EmailTransport,
  ov: OpportunityVolunteer,
): Promise<void> {
  const volunteerEmail = ov.volunteer?.person?.email;
  if (!volunteerEmail) {
    throw new Error(
      `sendEmailStale: missing email for volunteer ${ov.volunteerId}`,
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
