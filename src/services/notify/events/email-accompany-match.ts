import { Lang } from "need4deed-sdk";
import {
  emailAccompanyMatchManifestUrl,
  emailFromContact,
  emailFromNotify,
} from "../../../config/constants";
import OpportunityVolunteer from "../../../data/entity/m2m/opportunity-volunteer";
import { getLanguages } from "../../dto/utils";
import {
  createManifestLoader,
  fillTemplate,
  resolveContent,
  resolveLocale,
  type LocaleContent,
} from "../email-template";
import type { EmailTransport } from "../types";

const BUILTIN: Record<Lang, LocaleContent> = {
  [Lang.EN]: {
    subject:
      "Accompanying to an appointment on {{ appointmentDate }} in {{ appointmentDistrict }} for {{ clientName }}",
    text: `Dear {{ contactpersonName }},\n\n{{ volunteerName }} would be glad to provide interpreting support for this appointment. {{ volunteerName }} speaks {{ volunteerLanguage }}.\n\n{{ volunteerName }} has already received {{ clientName }}'s contact details and will get in touch with them shortly.\n\n{{ contactSharing }}\n\nBest regards,\nNeed4Deed`,
  },
  [Lang.DE]: {
    subject:
      "Begleitung zum Termin am {{ appointmentDate }} in {{ appointmentDistrict }} für {{ clientName }}",
    text: `Hallo {{ contactpersonName }},\n\n{{ volunteerName }} übernimmt gerne die Sprachmittlung für diesen Termin. {{ volunteerName }} spricht {{ volunteerLanguage }}.\n\n{{ volunteerName }} hat schon die Kontaktdaten von {{ clientName }} bekommen und meldet sich zeitnah bei der Person.\n\n{{ contactSharing }}\n\nViele Grüße\nNeed4Deed`,
  },
};

const loader = createManifestLoader(emailAccompanyMatchManifestUrl);

export function resetAccompanyMatchTemplateCache(): void {
  loader.resetCache();
}

function resolveContactSharing(
  shareContact: boolean,
  volunteerName: string,
  volunteerEmail: string,
  volunteerPhone: string,
  lang: Lang,
): string {
  if (shareContact) {
    return lang === Lang.DE
      ? `${volunteerName}s Kontaktdaten findest Du unten: ${volunteerEmail} ${volunteerPhone} Sollte es zur Terminabsage kommen, lass uns bitte wissen. Falls es zu einer kurzfristigen Absage kommt, kontaktiere ${volunteerName} gerne direkt. Gib bitte die Kontaktdaten des Sprachmittlers auf keinen Fall an die zu begleitende Person weiter.`
      : `You can find ${volunteerName}'s contact details below: ${volunteerEmail} ${volunteerPhone} Please let us know if the appointment is cancelled. If it is cancelled at short notice, feel free to contact ${volunteerName} directly. Please do not, under any circumstances, pass the interpreter's contact details on to the person being accompanied.`;
  }
  return lang === Lang.DE
    ? `Nach der Absprache mit ${volunteerName} dürfen wir Dir leider die Kontaktdaten nicht weitergeben. Sollte es zur Terminabsage kommen, lass uns bitte wissen. Für Fragen stehe ich Dir gerne zur Verfügung.`
    : `As agreed with ${volunteerName}, we are unfortunately unable to share their contact details with you. Please let us know if the appointment is cancelled. I am happy to help if you have any questions.`;
}

export async function sendEmailAccompanyMatch(
  email: EmailTransport,
  ov: OpportunityVolunteer,
): Promise<void> {
  const contactPersonEmail = ov.opportunity?.contactPerson?.email;
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
  const contactpersonName = opportunity.contactPerson!.name;

  const volunteerLanguage = getLanguages(volunteer.deal?.dealLanguage ?? [])
    .map((l) => l.title)
    .join(", ");

  const clientName = accompanying?.name ?? "";
  const appointmentDate = accompanying?.date
    ? new Date(accompanying.date).toLocaleDateString("de-DE", {
        timeZone: "Europe/Berlin",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
    : "";
  const appointmentDistrict =
    opportunity.district?.title ?? accompanying?.postcode?.value ?? "";

  const locale = resolveLocale(opportunity.contactPerson?.users?.[0]?.language);
  const contactSharing = resolveContactSharing(
    volunteer.shareContact ?? true,
    volunteerName,
    volunteerEmail,
    volunteerPhone,
    locale,
  );

  const content = resolveContent(await loader.load(), locale, BUILTIN);
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
