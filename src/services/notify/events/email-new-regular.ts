import { Lang } from "need4deed-sdk";
import {
  emailFromContact,
  emailNewRegularManifestUrl,
} from "../../../config/constants";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import logger from "../../../logger";
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
    subject: "Your request to Need4Deed",
    text: `Dear {{ contactpersonName }},\n\nThank you for sending us your volunteering opportunity "{{ volunteeringopportunityName }}".\n\nWe will start looking for volunteers as soon as possible.\n\nWe will let you know when we find someone and introduce the volunteer to you.\n\nBest regards,\nNeed4Deed`,
  },
  [Lang.DE]: {
    subject: "Deine Anfrage bei Need4Deed",
    text: `Hallo {{ contactpersonName }},\n\nvielen Dank für deine Anfrage zu "{{ volunteeringopportunityName }}".\n\nWir fangen bald mit der Suche an.\n\nWenn wir jemanden gefunden haben, melden wir uns bei dir und stellen dir die Person vor.\n\nViele Grüße\nNeed4Deed`,
  },
};

const loader = createManifestLoader(emailNewRegularManifestUrl);

export function resetNewRegularTemplateCache(): void {
  loader.resetCache();
}

export async function sendEmailNewRegular(
  email: EmailTransport,
  opportunity: Opportunity,
): Promise<void> {
  const contactPersonEmail = opportunity.contactPerson?.email;
  if (!contactPersonEmail) {
    logger.warn(
      `sendEmailNewRegular: missing contact email for opportunity ${opportunity.id}`,
    );
    return;
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
    from: emailFromContact,
    subject,
    ...(text !== undefined ? { text } : {}),
    ...(html !== undefined ? { html } : {}),
  });
}
