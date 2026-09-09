import {
  emailFromNotify,
  emailFromVolunteer,
  emailPostMatchCheckupManifestUrl,
} from "../../../config/constants";
import OpportunityVolunteer from "../../../data/entity/m2m/opportunity-volunteer";
import logger from "../../../logger";
import { POST_MATCH_CHECKUP_BUILTIN as BUILTIN } from "../builtin-content";
import {
  createManifestLoader,
  fillTemplate,
  resolveFlatContent,
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
  const content = resolveFlatContent(await loader.load(), BUILTIN);
  const { subject, text, html } = fillTemplate(content, { volunteerName });

  // TODO(be#961): temporary — remove once the cron-email rendering issue is
  // confirmed fixed. Logs the rendered email body, so it must not stay past
  // that.
  logger.debug(
    { ovId: ov.id, subject, text, html },
    "attempting to send post-match-checkup cron email",
  );

  await email.send({
    to: volunteerEmail,
    cc: emailFromVolunteer,
    from: emailFromNotify,
    subject,
    ...(text !== undefined ? { text } : {}),
    ...(html !== undefined ? { html } : {}),
  });
}
