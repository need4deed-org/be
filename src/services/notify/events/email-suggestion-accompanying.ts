import {
  emailFromNotify,
  emailFromVolunteer,
  emailSuggestionAccompanyingManifestUrl,
} from "../../../config/constants";
import OpportunityVolunteer from "../../../data/entity/m2m/opportunity-volunteer";
import { SUGGESTION_ACCOMPANYING_BUILTIN as BUILTIN } from "../builtin-content";
import {
  createManifestLoader,
  fillTemplate,
  resolveFlatContent,
} from "../email-template";
import type { EmailTransport } from "../types";

const loader = createManifestLoader(emailSuggestionAccompanyingManifestUrl);

export function resetSuggestionAccompanyingTemplateCache(): void {
  loader.resetCache();
}

// Counterpart to sendEmailSuggestion for ACCOMPANYING opportunities. Unlike a
// regular opportunity's recurring dealTimeslot, an accompanying opportunity
// has a single confirmed appointment (Opportunity.onetimer.date) set at
// creation — so this reads that instead of a schedule, same formatting
// convention as email-new-accompanying.ts/email-accompany-match.ts.
export async function sendEmailSuggestionAccompanying(
  email: EmailTransport,
  ov: OpportunityVolunteer,
): Promise<void> {
  const volunteerEmail = ov.volunteer?.person?.email;
  if (!volunteerEmail) {
    throw new Error(
      `sendEmailSuggestionAccompanying: missing email for volunteer ${ov.volunteerId}`,
    );
  }

  const volunteerName = ov.volunteer.person.name;
  const opportunity = ov.opportunity;
  const accompanying = opportunity?.accompanying;

  const appointmentTitle = opportunity?.title ?? "";
  const appointmentAddress = accompanying?.address ?? "";
  const appointmentPlz = accompanying?.postcode?.value ?? "";
  const appointmentDate = opportunity?.onetimer?.date
    ? new Date(opportunity.onetimer.date).toLocaleDateString("de-DE", {
        timeZone: "Europe/Berlin",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
    : "";
  const appointmentTime = opportunity?.onetimer?.date
    ? new Date(opportunity.onetimer.date).toLocaleTimeString("de-DE", {
        timeZone: "Europe/Berlin",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  const content = resolveFlatContent(await loader.load(), BUILTIN);
  const { subject, text, html } = fillTemplate(content, {
    volunteerName,
    appointmentTitle,
    appointmentAddress,
    appointmentPlz,
    appointmentDate,
    appointmentTime,
  });

  await email.send({
    to: volunteerEmail,
    cc: emailFromVolunteer,
    from: emailFromNotify,
    subject,
    ...(text !== undefined ? { text } : {}),
    ...(html !== undefined ? { html } : {}),
  });
}
