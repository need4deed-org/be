import {
  emailFromContact,
  emailFromNotify,
  emailRegularUpdateManifestUrl,
} from "../../../config/constants";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import { REGULAR_UPDATE_BUILTIN as BUILTIN } from "../builtin-content";
import {
  createManifestLoader,
  fillTemplate,
  resolveFlatContent,
} from "../email-template";
import type { EmailTransport } from "../types";

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

  const content = resolveFlatContent(await loader.load(), BUILTIN);
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
