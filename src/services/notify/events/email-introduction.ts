import { DocumentStatusType, VolunteerStateCGCType } from "need4deed-sdk";
import {
  emailFromContact,
  emailFromNotify,
  emailFromVolunteer,
  emailIntroductionManifestUrl,
} from "../../../config/constants";
import OpportunityVolunteer from "../../../data/entity/m2m/opportunity-volunteer";
import { getOpportunityRepresentativePerson } from "../../../data/utils";
import {
  formatScheduleDe,
  getLanguages,
  getOptionItems,
} from "../../dto/utils";
import { INTRODUCTION_BUILTIN as BUILTIN } from "../builtin-content";
import {
  createManifestLoader,
  fillTemplate,
  resolveFlatContent,
} from "../email-template";
import { resolveScheduleOrAlert } from "../resolve-schedule-or-alert";
import type { EmailTransport } from "../types";

const loader = createManifestLoader(emailIntroductionManifestUrl);

export function resetIntroductionTemplateCache(): void {
  loader.resetCache();
}

// German-only, matching introduction.json's certificateStatements block —
// this template is no longer split by recipient locale (see be#838).
function resolveStatmentOnCertificates(
  statusCGC: DocumentStatusType,
  statusCgcProcess: VolunteerStateCGCType | null | undefined,
  statusVaccination: DocumentStatusType,
): string {
  const cgcNo = statusCGC === DocumentStatusType.NO;
  const cgcYes = statusCGC === DocumentStatusType.YES;
  const missing = statusCgcProcess === VolunteerStateCGCType.MISSING;
  const uploaded = statusCgcProcess === VolunteerStateCGCType.UPLOADED;
  const vaccinationYes = statusVaccination === DocumentStatusType.YES;

  if (cgcNo && missing && vaccinationYes) {
    return "Das erweiterte Führungszeugnis beantragen wir sofort. Der Masernschutznachweis liegt vor.";
  }
  if (cgcNo && missing && !vaccinationYes) {
    return "Das erweiterte Führungszeugnis beantragen wir sofort.";
  }
  if (cgcNo && uploaded && vaccinationYes) {
    return "Das erweiterte Führungszeugnis haben wir bereits beantragt. Der Masernschutznachweis liegt vor.";
  }
  if (cgcNo && uploaded && !vaccinationYes) {
    return "Das erweiterte Führungszeugnis haben wir bereits beantragt.";
  }
  if (cgcYes && vaccinationYes) {
    return "Das erweiterte Führungszeugnis sowie der Masernschutznachweis liegen vor.";
  }
  if (cgcYes && !vaccinationYes) {
    return "Das erweiterte Führungszeugnis liegt vor.";
  }
  return "";
}

export async function sendEmailIntroduction(
  email: EmailTransport,
  ov: OpportunityVolunteer,
  // Bypasses dry-run redirection, same as ValidatingEmailTransport's
  // errorTransport (be#847) — defaults to `email` for callers that don't
  // care about that distinction (e.g. tests with a single mock transport).
  errorTransport: EmailTransport = email,
): Promise<void> {
  const volunteerEmail = ov.volunteer?.person?.email;
  const contactPerson = getOpportunityRepresentativePerson(ov.opportunity);
  const contactPersonEmail = contactPerson?.email;

  if (!volunteerEmail || !contactPersonEmail) {
    throw new Error(
      `sendEmailIntroduction: missing email(s) for ov ${ov.id} (volunteer=${volunteerEmail}, contact=${contactPersonEmail})`,
    );
  }

  const volunteer = ov.volunteer;
  const opportunity = ov.opportunity;

  const volunteerName = volunteer.person.name;
  const contactpersonName = contactPerson.name;
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

  const volSchedule = await resolveScheduleOrAlert(
    errorTransport,
    volunteer.deal?.dealTimeslot ?? [],
    formatScheduleDe,
    "wird noch abgestimmt",
    `sendEmailIntroduction, ov ${ov.id}`,
  );

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
  );

  const content = resolveFlatContent(await loader.load(), BUILTIN);
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
    contactpersonPhone: contactPerson.phone ?? "",
    agentAddress,
    statmentOnCertificates,
  });

  await email.send({
    to: [volunteerEmail, contactPersonEmail],
    cc: [emailFromContact, emailFromVolunteer],
    from: emailFromNotify,
    subject,
    ...(text !== undefined ? { text } : {}),
    ...(html !== undefined ? { html } : {}),
  });
}
