import { EmailTemplateName, Lang } from "need4deed-sdk";
import { emailFromContact, emailFromNotify } from "../../../config/constants";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import { getOpportunityRepresentativePerson } from "../../../data/utils";
import { NEW_REGULAR_BUILTIN as BUILTIN } from "../builtin-content";
import { fillTemplate, resolveFlatContent } from "../email-template";
import { EMAIL_TEMPLATES, EmailTemplateVars } from "../email-templates";
import { opportunityTitleIn } from "../opportunity-title";
import type { EmailTransport } from "../types";

const { loader } = EMAIL_TEMPLATES[EmailTemplateName.CONFIRMATION];

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
  const volunteeringopportunityName = await opportunityTitleIn(
    opportunity,
    Lang.DE,
  );

  const content = resolveFlatContent(await loader.load(), BUILTIN);
  const { subject, text, html } = fillTemplate(content, {
    contactpersonName,
    volunteeringopportunityName,
  } satisfies EmailTemplateVars<EmailTemplateName.CONFIRMATION>);

  await email.send({
    to: contactPersonEmail,
    cc: emailFromContact,
    from: emailFromNotify,
    subject,
    ...(text !== undefined ? { text } : {}),
    ...(html !== undefined ? { html } : {}),
  });
}
