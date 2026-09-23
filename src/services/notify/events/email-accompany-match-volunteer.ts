import {
  emailAccompanyMatchVolunteerManifestUrl,
  emailFromNotify,
  emailFromVolunteer,
} from "../../../config/constants";
import OpportunityVolunteer from "../../../data/entity/m2m/opportunity-volunteer";
import { getOpportunityRepresentativePerson } from "../../../data/utils";
import { formatAccompaniedPersonLanguage, getLanguages } from "../../dto/utils";
import { ACCOMPANY_MATCH_VOLUNTEER_BUILTIN as BUILTIN } from "../builtin-content";
import {
  createManifestLoader,
  fillTemplate,
  resolveFlatContent,
} from "../email-template";
import type { EmailTransport } from "../types";

const loader = createManifestLoader(emailAccompanyMatchVolunteerManifestUrl);

export function resetAccompanyMatchVolunteerTemplateCache(): void {
  loader.resetCache();
}

// Counterpart to sendEmailAccompanyMatch: that one tells the NGO contact who
// is taking over the appointment, this one tells the matched VOLUNTEER the
// full appointment details (date/time/address/accompanied-person contact)
// they need to actually show up, plus who to reach at the organisation.
// There was previously no volunteer-facing email at all for this event.
export async function sendEmailAccompanyMatchVolunteer(
  email: EmailTransport,
  ov: OpportunityVolunteer,
): Promise<void> {
  const volunteerEmail = ov.volunteer?.person?.email;
  if (!volunteerEmail) {
    throw new Error(
      `sendEmailAccompanyMatchVolunteer: missing email for volunteer ${ov.volunteerId}`,
    );
  }

  const opportunity = ov.opportunity;
  const accompanying = opportunity?.accompanying;
  const contactPerson = getOpportunityRepresentativePerson(opportunity);

  const volunteerName = ov.volunteer.person.name;
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
  const accompaniedpersonName = accompanying?.name ?? "";
  const accompaniedpersonPhone = accompanying?.phone ?? "";
  const accompaniedpersonLanguage = formatAccompaniedPersonLanguage(
    accompanying?.languageToTranslate,
    getLanguages(opportunity?.deal?.dealLanguage ?? []).map((l) => l.title),
  );
  const appointmentComment = opportunity?.info ?? "";
  const contactpersonName = contactPerson?.name ?? "";
  const contactpersonEmail = contactPerson?.email ?? "";
  const contactpersonPhone = contactPerson?.phone ?? "";

  const content = resolveFlatContent(await loader.load(), BUILTIN);
  const { subject, text, html } = fillTemplate(content, {
    volunteerName,
    appointmentTitle,
    appointmentAddress,
    appointmentPlz,
    appointmentDate,
    appointmentTime,
    accompaniedpersonName,
    accompaniedpersonPhone,
    accompaniedpersonLanguage,
    appointmentComment,
    contactpersonName,
    contactpersonEmail,
    contactpersonPhone,
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
