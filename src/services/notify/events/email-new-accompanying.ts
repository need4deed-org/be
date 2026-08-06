import { TranslatedIntoType } from "need4deed-sdk";
import {
  emailFromAccompanying,
  emailFromContact,
  emailFromNotify,
  emailNewAccompanyingManifestUrl,
} from "../../../config/constants";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import { getOpportunityRepresentativePerson } from "../../../data/utils";
import { NEW_ACCOMPANYING_BUILTIN as BUILTIN } from "../builtin-content";
import {
  createManifestLoader,
  fillTemplate,
  resolveFlatContent,
} from "../email-template";
import type { EmailTransport } from "../types";

const loader = createManifestLoader(emailNewAccompanyingManifestUrl);

// Matches fe's own labels for these values (public/locales/de/translations.json)
// — German-only since this template is (be#838).
const TRANSLATION_LABELS: Record<TranslatedIntoType, string> = {
  [TranslatedIntoType.DEUTSCHE]: "Nur Deutsch",
  [TranslatedIntoType.ENGLISH_OK]: "Deutsch oder Englisch",
  [TranslatedIntoType.NO_TRANSLATION]: "Keine Sprachmittlung (Wegbegleitung)",
};

function translationLabel(value: TranslatedIntoType | undefined): string {
  return value ? (TRANSLATION_LABELS[value] ?? "") : "";
}

export function resetNewAccompanyingTemplateCache(): void {
  loader.resetCache();
}

export async function sendEmailNewAccompanying(
  email: EmailTransport,
  opportunity: Opportunity,
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
  const appointmentDate = opportunity.onetimer?.date
    ? new Date(opportunity.onetimer.date).toLocaleDateString("de-DE", {
        timeZone: "Europe/Berlin",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
    : "";
  const appointmentTime = opportunity.onetimer?.date
    ? new Date(opportunity.onetimer.date).toLocaleTimeString("de-DE", {
        timeZone: "Europe/Berlin",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";
  const appointmentDistrict =
    opportunity.district?.title ?? accompanying?.postcode?.value ?? "";
  const appointmentPlz = accompanying?.postcode?.value ?? "";
  const clientName = accompanying?.name ?? "";
  const appointmentTitle = opportunity.title;
  const appointmentAddress = accompanying?.address ?? "";
  // Both slots come from the same submission field (be#846) — there's no
  // second, independently-set value anywhere in the codebase today
  // (opportunity.translationType has no other reader or writer besides this
  // one email). Mapped to the same human-readable label rather than left as
  // the raw enum value ("deutsche").
  const accompaniedpersonLanguage = translationLabel(
    accompanying?.languageToTranslate,
  );
  const appointmentaLanguage = accompaniedpersonLanguage;
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
