import { Lang } from "need4deed-sdk";
import {
  emailFromAccompanying,
  emailFromContact,
  emailFromNotify,
  emailNewAccompanyingManifestUrl,
} from "../../../config/constants";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import { getOpportunityRepresentativePerson } from "../../../data/utils";
import { formatOnetimerDate, formatOnetimerTime } from "../../dto/utils";
import { NEW_ACCOMPANYING_BUILTIN as BUILTIN } from "../builtin-content";
import {
  createManifestLoader,
  fillTemplate,
  resolveFlatContent,
} from "../email-template";
import { resolveAccompaniedPersonLanguage } from "../resolve-accompanied-person-language";
import type { EmailTransport } from "../types";

const loader = createManifestLoader(emailNewAccompanyingManifestUrl);

export function resetNewAccompanyingTemplateCache(): void {
  loader.resetCache();
}

export async function sendEmailNewAccompanying(
  email: EmailTransport,
  opportunity: Opportunity,
  errorTransport: EmailTransport = email,
): Promise<void> {
  const contactPerson = getOpportunityRepresentativePerson(opportunity);
  const contactPersonEmail = contactPerson?.email;
  if (!contactPersonEmail) {
    throw new Error(
      `sendEmailNewAccompanying: missing contact email for opportunity ${opportunity.id}`,
    );
  }

  const accompanying = opportunity.accompanying;
  const contactpersonName = contactPerson.name;
  const appointmentDate = formatOnetimerDate(opportunity.onetimer?.date);
  const appointmentTime = formatOnetimerTime(opportunity.onetimer?.date);
  const appointmentDistrict =
    opportunity.district?.title ?? accompanying?.postcode?.value ?? "";
  const appointmentPlz = accompanying?.postcode?.value ?? "";
  const clientName = accompanying?.name ?? "";
  const appointmentTitle = opportunity.title;
  const appointmentAddress = accompanying?.address ?? "";
  const { [Lang.DE]: accompaniedpersonLanguage } =
    await resolveAccompaniedPersonLanguage(
      errorTransport,
      accompanying?.languageToTranslate,
      opportunity.deal?.dealLanguage ?? [],
      `sendEmailNewAccompanying, opportunity ${opportunity.id}`,
    );
  const accompaniedpersonName = accompanying?.name ?? "";
  const accompaniedpersonPhone = accompanying?.phone ?? "";
  const appointmentComment =
    opportunity.infoConfidential || opportunity.info || "";

  const content = resolveFlatContent(await loader.load(), BUILTIN);
  const { subject, text, html } = fillTemplate(content, {
    contactpersonName,
    appointmentDate,
    appointmentTime,
    appointmentDistrict,
    appointmentPlz,
    clientName,
    appointmentTitle,
    appointmentAddress,
    accompaniedpersonLanguage,
    accompaniedpersonName,
    accompaniedpersonPhone,
    appointmentComment,
    appointmentaLanguage: "",
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
