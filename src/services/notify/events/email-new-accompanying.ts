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
  // Bypasses dry-run redirection, same as ValidatingEmailTransport's
  // errorTransport (be#847) — defaults to `email` for callers that don't
  // care about that distinction (e.g. tests with a single mock transport).
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
  // Combines the translation-target requirement (be#846) with the deal's
  // own requested source language(s) — German-translated via
  // field_translation by the caller before this function runs (be#856) —
  // into a single "Deutsch-Arabisch"-style pair instead of two disconnected
  // values (fe#1036 review thread).
  const accompaniedpersonLanguage = await resolveAccompaniedPersonLanguage(
    errorTransport,
    accompanying?.languageToTranslate,
    opportunity.deal?.dealLanguage ?? [],
    `sendEmailNewAccompanying, opportunity ${opportunity.id}`,
  );
  const accompaniedpersonName = accompanying?.name ?? "";
  const accompaniedpersonPhone = accompanying?.phone ?? "";
  const appointmentComment = opportunity.info ?? "";

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
    // TODO(be#1042 review): remove once the live CDN confirmationaccompanying.json
    // drops {{ appointmentaLanguage }} — until then, deploying this code
    // first would leave that placeholder unresolved and
    // ValidatingEmailTransport would suspend every send.
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
