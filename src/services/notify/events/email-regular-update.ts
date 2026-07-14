import { Lang } from "need4deed-sdk";
import {
  emailFromContact,
  emailFromNotify,
  emailRegularUpdateManifestUrl,
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
    subject: "Status of your volunteering opportunity — Need4Deed",
    text: `Dear {{ contactpersonName }},\n\nWe are checking in to see if you are still looking for volunteers for "{{ volunteeringopportunityName }}".\n\nPlease let us know within two weeks. Otherwise we will mark this volunteering opportunity as inactive in our system.\n\nBest regards,\nNeed4Deed`,
  },
  [Lang.DE]: {
    subject: "Aktualisierung der Gesuche bei Need4Deed",
    text: `Hallo {{ contactpersonName }},\n\nwir möchten gerne wissen, ob das Gesuch "{{ volunteeringopportunityName }}" noch aktuell ist.\n\nSollten wir innerhalb von 2 Wochen keine Rückmeldung bekommen, werden wir das Gesuch als "Inaktiv" markieren.\n\nWir freuen uns darauf, von Dir zu hören.\n\nViele Grüße\nNeed4Deed`,
  },
};

const loader = createManifestLoader(emailRegularUpdateManifestUrl);

export function resetRegularUpdateTemplateCache(): void {
  loader.resetCache();
}

export async function sendEmailRegularUpdate(
  email: EmailTransport,
  opportunity: Opportunity,
): Promise<void> {
  const contactPersonEmail = opportunity.contactPerson?.email;
  if (!contactPersonEmail) {
    throw new Error(
      `sendEmailRegularUpdate: missing contact email for opportunity ${opportunity.id}`,
    );
  }

  const contactpersonName = opportunity.contactPerson!.name;
  const volunteeringopportunityName = opportunity.title;

  const locale = resolveLocale(opportunity.contactPerson?.users?.[0]?.language);
  const content = resolveContent(await loader.load(), locale, BUILTIN);
  const { subject, text, html } = fillTemplate(content, {
    contactpersonName,
    volunteeringopportunityName,
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
