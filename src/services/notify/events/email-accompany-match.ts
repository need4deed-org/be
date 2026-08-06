import {
  emailAccompanyMatchManifestUrl,
  emailFromContact,
  emailFromNotify,
} from "../../../config/constants";
import OpportunityVolunteer from "../../../data/entity/m2m/opportunity-volunteer";
import { getOpportunityRepresentativePerson } from "../../../data/utils";
import { getLanguages } from "../../dto/utils";
import { ACCOMPANY_MATCH_BUILTIN as BUILTIN } from "../builtin-content";
import {
  createManifestLoader,
  fillTemplate,
  resolveFlatContent,
} from "../email-template";
import type { EmailTransport } from "../types";

const loader = createManifestLoader(emailAccompanyMatchManifestUrl);

export function resetAccompanyMatchTemplateCache(): void {
  loader.resetCache();
}

// German-only — accompanymatch.json is no longer split by recipient locale
// (see be#838); its recipients (RAC contact persons) are always German-speaking.
function resolveContactSharing(
  shareContact: boolean,
  volunteerName: string,
  volunteerEmail: string,
  volunteerPhone: string,
): string {
  if (shareContact) {
    return `${volunteerName}s Kontaktdaten findest Du unten: ${volunteerEmail} ${volunteerPhone} Sollte es zur Terminabsage kommen, lass uns bitte wissen. Falls es zu einer kurzfristigen Absage kommt, kontaktiere ${volunteerName} gerne direkt. Gib bitte die Kontaktdaten des Sprachmittlers auf keinen Fall an die zu begleitende Person weiter.`;
  }
  return `Nach der Absprache mit ${volunteerName} dürfen wir Dir leider die Kontaktdaten nicht weitergeben. Sollte es zur Terminabsage kommen, lass uns bitte wissen. Für Fragen stehe ich Dir gerne zur Verfügung.`;
}

export async function sendEmailAccompanyMatch(
  email: EmailTransport,
  ov: OpportunityVolunteer,
): Promise<void> {
  const contactPerson = getOpportunityRepresentativePerson(ov.opportunity);
  const contactPersonEmail = contactPerson?.email;
  if (!contactPersonEmail) {
    throw new Error(
      `sendEmailAccompanyMatch: missing contact email for opportunity ${ov.opportunityId}`,
    );
  }

  const volunteer = ov.volunteer;
  if (!volunteer?.person) {
    throw new Error(
      `sendEmailAccompanyMatch: missing volunteer or person relation for ov ${ov.id}`,
    );
  }
  if (!volunteer.deal) {
    throw new Error(
      `sendEmailAccompanyMatch: volunteer ${volunteer.id} has no deal relation`,
    );
  }

  const opportunity = ov.opportunity;
  const accompanying = opportunity.accompanying;

  const volunteerName = volunteer.person.name;
  const volunteerEmail = volunteer.person.email ?? "";
  const volunteerPhone = volunteer.person.phone ?? "";
  const contactpersonName = contactPerson.name;

  const volunteerLanguage = getLanguages(volunteer.deal?.dealLanguage ?? [])
    .map((l) => l.title)
    .join(", ");

  const clientName = accompanying?.name ?? "";
  const appointmentDate = opportunity.onetimer?.date
    ? new Date(opportunity.onetimer.date).toLocaleDateString("de-DE", {
        timeZone: "Europe/Berlin",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
    : "";
  const appointmentDistrict =
    opportunity.district?.title ?? accompanying?.postcode?.value ?? "";

  const contactSharing = resolveContactSharing(
    volunteer.shareContact ?? true,
    volunteerName,
    volunteerEmail,
    volunteerPhone,
  );

  const content = resolveFlatContent(await loader.load(), BUILTIN);
  const { subject, text, html } = fillTemplate(content, {
    contactpersonName,
    volunteerName,
    volunteerLanguage,
    clientName,
    appointmentDate,
    appointmentDistrict,
    volunteerEmail,
    volunteerPhone,
    contactSharing,
  });

  await email.send({
    to: contactPersonEmail,
    cc: emailFromContact,
    from: emailFromNotify,
    subject,
    ...(text !== undefined ? { text } : {}),
    ...(html !== undefined ? { html } : {}),
  });
}
