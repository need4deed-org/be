import { Lang } from "need4deed-sdk";
import {
  emailFromNotify,
  emailFromVolunteer,
  emailSuggestionManifestUrl,
} from "../../../config/constants";
import OpportunityVolunteer from "../../../data/entity/m2m/opportunity-volunteer";
import { formatScheduleLocalized } from "../../dto/utils";
import { SUGGESTION_BUILTIN as BUILTIN } from "../builtin-content";
import { createManifestLoader, renderEmail } from "../email-template";
import {
  OPPORTUNITY_SCHEDULE_LABELS,
  resolveOrAlert,
} from "../resolve-or-alert";
import type { EmailTransport } from "../types";

const loader = createManifestLoader(emailSuggestionManifestUrl);

export function resetSuggestionTemplateCache(): void {
  loader.resetCache();
}

export async function sendEmailSuggestion(
  email: EmailTransport,
  ov: OpportunityVolunteer,
  errorTransport: EmailTransport = email,
): Promise<void> {
  const volunteerEmail = ov.volunteer?.person?.email;
  if (!volunteerEmail) {
    throw new Error(
      `sendEmailSuggestion: missing email for volunteer ${ov.volunteerId}`,
    );
  }

  const volunteerName = ov.volunteer.person.name;
  const opportunityName = ov.opportunity?.title ?? "";
  const plz = ov.opportunity?.deal?.postcode?.value ?? "";
  const opportunitySchedule = await resolveOrAlert(
    errorTransport,
    ov.opportunity?.deal?.dealTimeslot ?? [],
    formatScheduleLocalized,
    { [Lang.EN]: "to be confirmed", [Lang.DE]: "wird noch abgestimmt" },
    `sendEmailSuggestion, ov ${ov.id}`,
    OPPORTUNITY_SCHEDULE_LABELS,
  );

  const { subject, text, html } = renderEmail(await loader.load(), BUILTIN, {
    volunteerName,
    opportunityName,
    plz,
    opportunitySchedule,
    schedule: opportunitySchedule,
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
