import { Lang } from "need4deed-sdk";
import {
  emailAccompanyNotFoundManifestUrl,
  emailFromAccompanying,
  emailFromContact,
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
      "Accompanying to an appointment on {{ appointmentDate }} in {{ appointmentDistrict }} for {{ clientName }}",
    text: `Dear {{ contactpersonName }},\n\nUnfortunately, we were unable to find a volunteer for this appointment. We have now called off our search.\n\nBest regards,\nNeed4Deed`,
  },
  [Lang.DE]: {
    subject:
      "Begleitung zum Termin am {{ appointmentDate }} in {{ appointmentDistrict }} für {{ clientName }}",
    text: `Hallo {{ contactpersonName }},\n\nleider hat sich niemand für die Sprachmittlung gemeldet. Wir haben nun unsere Suche eingestellt.\n\nViele Grüße\nNeed4Deed`,
  },
};

const loader = createManifestLoader(emailAccompanyNotFoundManifestUrl);

export function resetAccompanyNotFoundTemplateCache(): void {
  loader.resetCache();
}

export async function sendEmailAccompanyNotFound(
  email: EmailTransport,
  opportunity: Opportunity,
): Promise<void> {
  const contactPersonEmail = opportunity.contactPerson?.email;
  if (!contactPersonEmail) {
    throw new Error(
      `sendEmailAccompanyNotFound: missing contact email for opportunity ${opportunity.id}`,
    );
  }

  const contactpersonName = opportunity.contactPerson!.name;
  const accompanying = opportunity.accompanying;
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

  const locale = resolveLocale(opportunity.contactPerson?.users?.[0]?.language);
  const content = resolveContent(await loader.load(), locale, BUILTIN);
  const { subject, text, html } = fillTemplate(content, {
    contactpersonName,
    appointmentDate,
    appointmentDistrict,
    clientName,
  });

  await email.send({
    to: contactPersonEmail,
    cc: emailFromAccompanying,
    from: emailFromContact,
    subject,
    ...(text !== undefined ? { text } : {}),
    ...(html !== undefined ? { html } : {}),
  });
}
