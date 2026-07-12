import { Lang } from "need4deed-sdk";
import {
  emailFromAccompanying,
  emailFromContact,
  emailFromNotify,
  emailNewAccompanyingManifestUrl,
} from "../../../config/constants";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
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
      "Accompanying appointment on {{ appointmentDate }} in {{ appointmentDistrict }} for {{ clientName }}",
    text: `Dear {{ contactpersonName }},\n\nThank you for your request.\n\nHere are the details you provided. Please check that everything is correct:\n {{ appointmentTitle }}\n {{ appointmentDistrict }}\n {{ appointmentAddress }}\n {{ accompaniedpersonLanguage }}\n{{ appointmentaLanguage }}\n{{ accompaniedpersonName }}\n{{ accompaniedpersonPhone }}\n{{ appointmentComment }}\n\nWe will review the information promptly and get back to you within two days if anything is missing.\n\nIf all the details are correct and the accompaniment is straightforward (e.g. not a hospital treatment, a brief description is provided, and a direct phone number of the contact person is available), we will forward your request to our volunteers. We will get back to you once we have found someone for the appointment.\nIf we are unable to find a volunteer for the appointment, we will let you know no later than four working days beforehand.\n\nMore information about our guidelines can be found at https://need4deed.org/rac-guidelines\n\nBest regards,\nThe Team`,
  },
  [Lang.DE]: {
    subject:
      "Begleitung zum Termin am {{ appointmentDate }} in {{ appointmentDistrict }} für {{ clientName }}",
    text: `Hallo {{ contactpersonName }},\n\nvielen Dank für die Anfrage.\n\nHier sind die angegebenen Details. Bitte prüfe kurz, ob alles stimmt:\n {{ appointmentTitle }}\n {{ appointmentDistrict }}\n {{ appointmentAddress }}\n {{ accompaniedpersonLanguage }}\n{{ appointmentaLanguage }}\n{{ accompaniedpersonName }}\n{{ accompaniedpersonPhone }}\n{{ appointmentComment }}\n\nWir überprüfen die Informationen umgehend und melden uns innerhalb von zwei Tagen, falls etwas fehlt.\n\nFalls alle Angaben korrekt sind und die Begleitung klar ist (z. B. keine Krankenhausbehandlung, kurze Beschreibung und verfügbare Direktnummer der begleitenden Person), leiten wir deine Anfrage an die Freiwilligen weiter. Wir melden uns, sobald wir jemanden für den Termin gefunden haben.\nFalls wir keine Freiwilligen für den Termin vermitteln können, melden wir uns spätestens vier Werktage vorher.\n\nMehr Informationen über die Leitlinien findest Du unter https://need4deed.org/rac-guidelines\n\nViele Grüße\nDas Team`,
  },
};

const loader = createManifestLoader(emailNewAccompanyingManifestUrl);

export function resetNewAccompanyingTemplateCache(): void {
  loader.resetCache();
}

export async function sendEmailNewAccompanying(
  email: EmailTransport,
  opportunity: Opportunity,
): Promise<void> {
  const contactPersonEmail = opportunity.contactPerson?.email;
  if (!contactPersonEmail) {
    throw new Error(
      `sendEmailNewAccompanying: missing contact email for opportunity ${opportunity.id}`,
    );
  }

  const accompanying = opportunity.accompanying;
  const contactpersonName = opportunity.contactPerson!.name;
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
  const clientName = accompanying?.name ?? "";
  const appointmentTitle = opportunity.title;
  const appointmentAddress = accompanying?.address ?? "";
  const accompaniedpersonLanguage = accompanying?.languageToTranslate ?? "";
  const appointmentaLanguage = opportunity.translationType ?? "";
  const accompaniedpersonName = accompanying?.name ?? "";
  const accompaniedpersonPhone = accompanying?.phone ?? "";
  const appointmentComment = opportunity.info ?? "";

  const locale = resolveLocale(opportunity.contactPerson?.users?.[0]?.language);
  const content = resolveContent(await loader.load(), locale, BUILTIN);
  const { subject, text, html } = fillTemplate(content, {
    contactpersonName,
    appointmentDate,
    appointmentDistrict,
    clientName,
    appointmentTitle,
    appointmentAddress,
    accompaniedpersonLanguage,
    appointmentaLanguage,
    accompaniedpersonName,
    accompaniedpersonPhone,
    appointmentComment,
  });

  await email.send({
    to: contactPersonEmail,
    cc: [emailFromContact, emailFromAccompanying],
    from: emailFromNotify,
    subject,
    ...(text !== undefined ? { text } : {}),
    ...(html !== undefined ? { html } : {}),
  });
}
