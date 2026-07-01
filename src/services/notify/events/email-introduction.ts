import { DocumentStatusType, Lang, VolunteerStateCGCType } from "need4deed-sdk";
import {
  emailFromContact,
  emailFromVolunteer,
  emailIntroductionManifestUrl,
} from "../../../config/constants";
import OpportunityVolunteer from "../../../data/entity/m2m/opportunity-volunteer";
import { getLanguages, getOptionItems, getTitles } from "../../dto/utils";
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
      "Introduction — {{ volunteerName }} & {{ volunteeringopportunityName }}",
    text: `Dear {{ contactpersonName }}, dear {{ volunteerName }},\n\nWe are delighted to introduce you to each other for the volunteering opportunity "{{ volunteeringopportunityName }}".\n\n{{ volunteerName }} speaks {{ volunteerLanguage }} and has the following skills: {{ volunteerSkills }}.\nAvailability: {{ volSchedule }}\n\n{{ statmentOnCertificates }}\n\nVolunteer contact:\n{{ volunteerName }}\n{{ volunteerEmail }}\n{{ volunteerPhone }}\n\nCenter contact:\n{{ contactpersonName }}\n{{ contactpersonEmail }}\n{{ contactpersonPhone }}\n{{ agentAddress }}\n\nPlease feel free to get in touch with each other directly to arrange the details. If you have any questions, do not hesitate to contact us.\n\nBest regards,\nNeed4Deed`,
  },
  [Lang.DE]: {
    subject:
      "Vorstellung — {{ volunteerName }} & {{ volunteeringopportunityName }}",
    text: `Hallo {{ contactpersonName }}, hallo {{ volunteerName }},\n\nwir freuen uns, euch für das Gesuch „{{ volunteeringopportunityName }}" miteinander bekannt zu machen.\n\n{{ volunteerName }} spricht {{ volunteerLanguage }} und hat folgende Fähigkeiten: {{ volunteerSkills }}.\nVerfügbarkeit: {{ volSchedule }}\n\n{{ statmentOnCertificates }}\n\nKontaktdaten Ehrenamt:\n{{ volunteerName }}\n{{ volunteerEmail }}\n{{ volunteerPhone }}\n\nKontaktdaten Unterkunft:\n{{ contactpersonName }}\n{{ contactpersonEmail }}\n{{ contactpersonPhone }}\n{{ agentAddress }}\n\nIhr könnt gerne direkt miteinander in Kontakt treten, um die Details zu klären. Bei Fragen stehen wir gerne zur Verfügung.\n\nViele Grüße\nNeed4Deed`,
  },
};

const loader = createManifestLoader(emailIntroductionManifestUrl);

export function resetIntroductionTemplateCache(): void {
  loader.resetCache();
}

function resolveStatmentOnCertificates(
  statusCGC: DocumentStatusType,
  statusCgcProcess: VolunteerStateCGCType | null | undefined,
  statusVaccination: DocumentStatusType,
  lang: Lang,
): string {
  const cgcNo = statusCGC === DocumentStatusType.NO;
  const cgcYes = statusCGC === DocumentStatusType.YES;
  const missing = statusCgcProcess === VolunteerStateCGCType.MISSING;
  const uploaded = statusCgcProcess === VolunteerStateCGCType.UPLOADED;
  const vaccinationYes = statusVaccination === DocumentStatusType.YES;

  if (cgcNo && missing && vaccinationYes) {
    return lang === Lang.DE
      ? "Das erweiterte Führungszeugnis beantragen wir sofort. Der Masernschutznachweis liegt vor."
      : "We will apply for the certificate of good conduct (das erweiterte Führungszeugnis) for them. Proof of measles vaccination has been provided.";
  }
  if (cgcNo && missing && !vaccinationYes) {
    return lang === Lang.DE
      ? "Das erweiterte Führungszeugnis beantragen wir sofort."
      : "We will apply for the certificate of good conduct (das erweiterte Führungszeugnis) for them.";
  }
  if (cgcNo && uploaded && vaccinationYes) {
    return lang === Lang.DE
      ? "Das erweiterte Führungszeugnis haben wir bereits beantragt. Der Masernschutznachweis liegt vor."
      : "We have applied for the certificate of good conduct (das erweiterte Führungszeugnis) for them. Proof of measles vaccination has been provided.";
  }
  if (cgcNo && uploaded && !vaccinationYes) {
    return lang === Lang.DE
      ? "Das erweiterte Führungszeugnis haben wir bereits beantragt."
      : "We have applied for the certificate of good conduct (das erweiterte Führungszeugnis) for them.";
  }
  if (cgcYes && vaccinationYes) {
    return lang === Lang.DE
      ? "Das erweiterte Führungszeugnis sowie der Masernschutznachweis liegen vor."
      : "They have already gotten their certificate of good conduct (das erweiterte Führungszeugnis). Proof of measles vaccination has been provided.";
  }
  if (cgcYes && !vaccinationYes) {
    return lang === Lang.DE
      ? "Das erweiterte Führungszeugnis liegt vor."
      : "They have already gotten their certificate of good conduct (das erweiterte Führungszeugnis).";
  }
  return "";
}

export async function sendEmailIntroduction(
  email: EmailTransport,
  ov: OpportunityVolunteer,
): Promise<void> {
  const volunteerEmail = ov.volunteer?.person?.email;
  const contactPersonEmail = ov.opportunity?.contactPerson?.email;

  if (!volunteerEmail || !contactPersonEmail) {
    throw new Error(
      `sendEmailIntroduction: missing email(s) for ov ${ov.id} (volunteer=${volunteerEmail}, contact=${contactPersonEmail})`,
    );
  }

  const volunteer = ov.volunteer;
  const opportunity = ov.opportunity;
  const locale = resolveLocale(volunteer.person?.users?.[0]?.language);

  const volunteerName = volunteer.person.name;
  const contactpersonName = opportunity.contactPerson!.name;
  const volunteeringopportunityName = opportunity.title;

  const volunteerLanguage = getLanguages(volunteer.deal?.dealLanguage ?? [])
    .map((l) => l.title)
    .join(", ");

  const volunteerSkills = getOptionItems(
    volunteer.deal?.dealSkill ?? [],
    "skill",
  )
    .map((s) => s.title)
    .join(", ");

  const volSchedule =
    getTitles(volunteer.deal?.dealTimeslot ?? [], "timeslot")
      .map((t) => String(t))
      .join(", ") || "";

  const agentAddress = (() => {
    const addr = opportunity.agent?.address;
    if (!addr) {
      return "";
    }
    return [addr.street, addr.postcode?.value, addr.city]
      .filter(Boolean)
      .join(", ");
  })();

  const statmentOnCertificates = resolveStatmentOnCertificates(
    volunteer.statusCGC,
    volunteer.statusCgcProcess,
    volunteer.statusVaccination,
    locale,
  );

  const content = resolveContent(await loader.load(), locale, BUILTIN);
  const { subject, text, html } = fillTemplate(content, {
    contactpersonName,
    volunteerName,
    volunteeringopportunityName,
    volunteerSkills,
    volSchedule,
    volunteerLanguage,
    volunteerEmail,
    volunteerPhone: volunteer.person.phone ?? "",
    contactpersonEmail: contactPersonEmail,
    contactpersonPhone: opportunity.contactPerson!.phone ?? "",
    agentAddress,
    statmentOnCertificates,
  });

  await email.send({
    to: [volunteerEmail, contactPersonEmail, emailFromVolunteer],
    from: emailFromContact,
    subject,
    ...(text !== undefined ? { text } : {}),
    ...(html !== undefined ? { html } : {}),
  });
}
