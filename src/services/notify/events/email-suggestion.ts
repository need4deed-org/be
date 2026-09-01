import {
  emailFromNotify,
  emailFromVolunteer,
  emailSuggestionManifestUrl,
} from "../../../config/constants";
import OpportunityVolunteer from "../../../data/entity/m2m/opportunity-volunteer";
import { formatScheduleBilingual } from "../../dto/utils";
import { SUGGESTION_BUILTIN as BUILTIN } from "../builtin-content";
import {
  createManifestLoader,
  fillTemplate,
  resolveFlatContent,
} from "../email-template";
import { resolveScheduleOrAlert } from "../resolve-schedule-or-alert";
import type { EmailTransport } from "../types";

const loader = createManifestLoader(emailSuggestionManifestUrl);

export function resetSuggestionTemplateCache(): void {
  loader.resetCache();
}

export async function sendEmailSuggestion(
  email: EmailTransport,
  ov: OpportunityVolunteer,
  // Bypasses dry-run redirection, same as ValidatingEmailTransport's
  // errorTransport (be#847) — defaults to `email` for callers that don't
  // care about that distinction (e.g. tests with a single mock transport).
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
  const plz = ov.volunteer.deal?.postcode?.value ?? "";
  const schedule = await resolveScheduleOrAlert(
    errorTransport,
    ov.volunteer.deal?.dealTimeslot ?? [],
    formatScheduleBilingual,
    "wird noch abgestimmt/to be confirmed",
    `sendEmailSuggestion, ov ${ov.id}`,
  );

  const content = resolveFlatContent(await loader.load(), BUILTIN);
  const { subject, text, html } = fillTemplate(content, {
    volunteerName,
    opportunityName,
    plz,
    schedule,
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
