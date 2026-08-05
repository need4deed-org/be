import {
  emailFromContact,
  emailFromNotify,
  emailNewRegularManifestUrl,
} from "../../../config/constants";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import { getOpportunityRepresentativePerson } from "../../../data/utils";
import { NEW_REGULAR_BUILTIN as BUILTIN } from "../builtin-content";
import {
  createManifestLoader,
  fillTemplate,
  resolveContent,
  resolveLocale,
} from "../email-template";
import type { EmailTransport } from "../types";

const loader = createManifestLoader(emailNewRegularManifestUrl);

export function resetNewRegularTemplateCache(): void {
  loader.resetCache();
}

export async function sendEmailNewRegular(
  email: EmailTransport,
  opportunity: Opportunity,
): Promise<void> {
  const contactPerson = getOpportunityRepresentativePerson(opportunity);
  const contactPersonEmail = contactPerson?.email;
  if (!contactPersonEmail) {
    throw new Error(
      `sendEmailNewRegular: missing contact email for opportunity ${opportunity.id}`,
    );
  }

  const contactpersonName = contactPerson.name;
  const volunteeringopportunityName = opportunity.title;

  const locale = resolveLocale(contactPerson.users?.[0]?.language);
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
