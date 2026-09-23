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
  // The opportunity's own location/schedule, not the volunteer's — this
  // email describes where and when the *opportunity* takes place, so
  // reading from ov.volunteer.deal here (as this used to) instead read back
  // the volunteer's own postcode/general availability, unrelated to the
  // specific opportunity being suggested (fe#1036 / be schedule bug).
  const plz = ov.opportunity?.deal?.postcode?.value ?? "";
  const opportunitySchedule = await resolveOrAlert(
    errorTransport,
    ov.opportunity?.deal?.dealTimeslot ?? [],
    formatScheduleBilingual,
    "wird noch abgestimmt/to be confirmed",
    `sendEmailSuggestion, ov ${ov.id}`,
    OPPORTUNITY_SCHEDULE_LABELS,
  );

  const content = resolveFlatContent(await loader.load(), BUILTIN);
  const { subject, text, html } = fillTemplate(content, {
    volunteerName,
    opportunityName,
    plz,
    opportunitySchedule,
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
