import { EmailTemplateName, Lang } from "need4deed-sdk";
import { emailFromContact, emailFromNotify } from "../../../config/constants";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import { getOpportunityRepresentativePerson } from "../../../data/utils";
import { REGULAR_UPDATE_BUILTIN as BUILTIN } from "../builtin-content";
import { fillTemplate, resolveFlatContent } from "../email-template";
import { EMAIL_TEMPLATES, EmailTemplateVars } from "../email-templates";
import { opportunityTitleIn } from "../opportunity-title";
import type { EmailTransport } from "../types";

const { loader } = EMAIL_TEMPLATES[EmailTemplateName.UPDATE];

export function resetRegularUpdateTemplateCache(): void {
  loader.resetCache();
}

export async function sendEmailRegularUpdate(
  email: EmailTransport,
  opportunity: Opportunity,
): Promise<void> {
  const contactPerson = getOpportunityRepresentativePerson(opportunity, {
    includeSubmitter: false,
  });
  const contactPersonEmail = contactPerson?.email;
  if (!contactPersonEmail) {
    throw new Error(
      `sendEmailRegularUpdate: no email for the contact person or NGO of opportunity ${opportunity.id}`,
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
  } satisfies EmailTemplateVars<EmailTemplateName.UPDATE>);

  await email.send({
    to: contactPersonEmail,
    cc: emailFromContact,
    from: emailFromNotify,
    subject,
    ...(text !== undefined ? { text } : {}),
    ...(html !== undefined ? { html } : {}),
  });
}
