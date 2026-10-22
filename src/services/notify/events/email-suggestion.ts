import { Lang } from "need4deed-sdk";
import {
  emailFromNotify,
  emailFromVolunteer,
  emailSuggestionManifestUrl,
} from "../../../config/constants";
import OpportunityVolunteer from "../../../data/entity/m2m/opportunity-volunteer";
import { formatScheduleLocalized } from "../../dto/utils";
import { SUGGESTION_BUILTIN as BUILTIN } from "../builtin-content";
import { createManifestLoader, renderEmailWithNote } from "../email-template";
import { localizedOpportunityTitle } from "../opportunity-title";
import {
  OPPORTUNITY_SCHEDULE_LABELS,
  resolveOrAlert,
} from "../resolve-or-alert";
import type { EmailTransport } from "../types";

const loader = createManifestLoader(emailSuggestionManifestUrl);

const SCHEDULE_FALLBACK = {
  [Lang.EN]: "to be confirmed",
  [Lang.DE]: "wird noch abgestimmt",
};

const ONE_OF_THESE_TIMES_NOTE = {
  [Lang.EN]: " (you only need to be available at one of these times)",
  [Lang.DE]: " (du musst nur zu einer dieser Zeiten verfügbar sein)",
};

const NO_NOTE = { [Lang.EN]: "", [Lang.DE]: "" };

export function resetSuggestionTemplateCache(): void {
  loader.resetCache();
}

export async function sendEmailSuggestion(
  email: EmailTransport,
  ov: OpportunityVolunteer,
  errorTransport: EmailTransport = email,
  emailNote?: string,
): Promise<void> {
  const volunteerEmail = ov.volunteer?.person?.email;
  if (!volunteerEmail) {
    throw new Error(
      `sendEmailSuggestion: missing email for volunteer ${ov.volunteerId}`,
    );
  }

  const volunteerName = ov.volunteer.person.name;
  const opportunityName = await localizedOpportunityTitle(ov.opportunity);
  const plz = ov.opportunity?.deal?.postcode?.value ?? "";
  const dealTimeslot = ov.opportunity?.deal?.dealTimeslot ?? [];
  const opportunitySchedule = await resolveOrAlert(
    errorTransport,
    dealTimeslot,
    formatScheduleLocalized,
    SCHEDULE_FALLBACK,
    `sendEmailSuggestion, ov ${ov.id}`,
    OPPORTUNITY_SCHEDULE_LABELS,
  );
  const scheduleNote =
    opportunitySchedule !== SCHEDULE_FALLBACK && dealTimeslot.length > 1
      ? ONE_OF_THESE_TIMES_NOTE
      : NO_NOTE;

  const { subject, text, html } = renderEmailWithNote(
    await loader.load(),
    BUILTIN,
    {
      volunteerName,
      opportunityName,
      plz,
      opportunitySchedule,
      schedule: opportunitySchedule,
      scheduleNote,
    },
    emailNote,
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
