import { DocumentStatusType } from "need4deed-sdk";
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
import { DEAL_LANGUAGE_LABELS, resolveOrAlert } from "../resolve-or-alert";
import { resolveScheduleOrAlert } from "../resolve-schedule-or-alert";
import type { EmailTransport } from "../types";

const loader = createManifestLoader(emailIntroductionManifestUrl);

export function resetIntroductionTemplateCache(): void {
  loader.resetCache();
}

// German-only, matching introduction.json's certificateStatements block —
// this template is no longer split by recipient locale (see be#838).
//
// Previously branched on statusCgcProcess (UPLOADED/MISSING) to detect
// "already applied", but nothing in fe ever sets that field — the
// coordinator UI's CGC-application toggle instead writes statusCGC =
// APPLIED_N4D directly (VolunteerProfileDocument.tsx). Since neither
// cgcNo nor cgcYes matched APPLIED_N4D, that was the common case and this
// always rendered a blank statement for it (be#1042 review). Reads
// statusCGC's own three real-world values instead: NO (nothing done),
// APPLIED_N4D (N4D applied on the volunteer's behalf), YES (received).
// UNDEFINED/ASKED_TO_APPLY/APPLIED_SELF are unused by any code path today
// (grep confirms no writer), so they fall back to the "not yet applied"
// case rather than silently producing no statement.
function resolveStatmentOnCertificates(
  statusCGC: DocumentStatusType,
  statusVaccination: DocumentStatusType,
): string {
  const cgcReceived = statusCGC === DocumentStatusType.YES;
  const cgcApplied = statusCGC === DocumentStatusType.APPLIED_N4D;
  const vaccinationYes = statusVaccination === DocumentStatusType.YES;

  if (cgcReceived && vaccinationYes) {
    return "Das erweiterte Führungszeugnis sowie der Masernschutznachweis liegen vor.";
  }
  if (cgcReceived && !vaccinationYes) {
    return "Das erweiterte Führungszeugnis liegt vor.";
  }
  if (cgcApplied && vaccinationYes) {
    return "Das erweiterte Führungszeugnis haben wir bereits beantragt. Der Masernschutznachweis liegt vor.";
  }
  if (cgcApplied && !vaccinationYes) {
    return "Das erweiterte Führungszeugnis haben wir bereits beantragt.";
  }
  if (vaccinationYes) {
    return "Das erweiterte Führungszeugnis beantragen wir sofort. Der Masernschutznachweis liegt vor.";
  }
  return "Das erweiterte Führungszeugnis beantragen wir sofort.";
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

  const volunteerLanguage = await resolveOrAlert(
    errorTransport,
    volunteer.deal?.dealLanguage ?? [],
    (dealLanguage) =>
      getLanguages(dealLanguage)
        .map((l) => l.title)
        .join(", "),
    "",
    `sendEmailIntroduction, ov ${ov.id}`,
    DEAL_LANGUAGE_LABELS,
  );

  const volunteerSkills = await resolveOrAlert(
    errorTransport,
    volunteer.deal?.dealSkill ?? [],
    (dealSkill) =>
      getOptionItems(dealSkill, "skill")
        .map((s) => s.title)
        .join(", "),
    "",
    `sendEmailIntroduction, ov ${ov.id}`,
    {
      dataLabel: "dealSkill data",
      fieldLabel: "the volunteer's skills",
      rowsLabel: "dealSkill rows",
    },
  );

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
