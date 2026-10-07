import {
  emailAccompanyMatchVolunteerManifestUrl,
  emailFromAccompanying,
  emailFromNotify,
} from "../../../config/constants";
import OpportunityVolunteer from "../../../data/entity/m2m/opportunity-volunteer";
import { getOpportunityRepresentativePerson } from "../../../data/utils";
import { formatOnetimerDate, formatOnetimerTime } from "../../dto/utils";
import { ACCOMPANY_MATCH_VOLUNTEER_BUILTIN as BUILTIN } from "../builtin-content";
import { createManifestLoader, renderEmail } from "../email-template";
import { resolveAccompaniedPersonLanguage } from "../resolve-accompanied-person-language";
import type { EmailTransport } from "../types";

const loader = createManifestLoader(emailAccompanyMatchVolunteerManifestUrl);

export function resetAccompanyMatchVolunteerTemplateCache(): void {
  loader.resetCache();
}

export async function sendEmailAccompanyMatchVolunteer(
  email: EmailTransport,
  ov: OpportunityVolunteer,
  errorTransport: EmailTransport = email,
): Promise<void> {
  const volunteerEmail = ov.volunteer?.person?.email;
  if (!volunteerEmail) {
    throw new Error(
      `sendEmailAccompanyMatchVolunteer: missing email for volunteer ${ov.volunteerId}`,
    );
  }

  const opportunity = ov.opportunity;
  const accompanying = opportunity?.accompanying;
  const contactPerson = getOpportunityRepresentativePerson(opportunity);

  const volunteerName = ov.volunteer.person.name;
  const appointmentTitle = opportunity?.title ?? "";
  const appointmentAddress = accompanying?.address ?? "";
  const appointmentPlz = accompanying?.postcode?.value ?? "";
  const appointmentDate = formatOnetimerDate(opportunity?.onetimer?.date);
  const appointmentTime = formatOnetimerTime(opportunity?.onetimer?.date);
  const accompaniedpersonName = accompanying?.name ?? "";
  const accompaniedpersonPhone = accompanying?.phone ?? "";
  const accompaniedpersonLanguage = await resolveAccompaniedPersonLanguage(
    errorTransport,
    accompanying?.languageToTranslate,
    opportunity?.deal?.dealLanguage ?? [],
    `sendEmailAccompanyMatchVolunteer, ov ${ov.id}`,
  );
  const appointmentComment =
    opportunity?.infoConfidential || opportunity?.info || "";
  const contactpersonName = contactPerson?.name ?? "";
  const contactpersonEmail = contactPerson?.email ?? "";
  const contactpersonPhone = contactPerson?.phone ?? "";

  const { subject, text, html } = renderEmail(await loader.load(), BUILTIN, {
    volunteerName,
    appointmentTitle,
    appointmentAddress,
    appointmentPlz,
    appointmentDate,
    appointmentTime,
    accompaniedpersonName,
    accompaniedpersonPhone,
    accompaniedpersonLanguage,
    appointmentComment,
    contactpersonName,
    contactpersonEmail,
    contactpersonPhone,
  });

  await email.send({
    to: volunteerEmail,
    cc: emailFromAccompanying,
    from: emailFromNotify,
    subject,
    ...(text !== undefined ? { text } : {}),
    ...(html !== undefined ? { html } : {}),
  });
}
