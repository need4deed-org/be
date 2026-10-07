import {
  emailFromAccompanying,
  emailFromNotify,
  emailSuggestionAccompanyingManifestUrl,
} from "../../../config/constants";
import OpportunityVolunteer from "../../../data/entity/m2m/opportunity-volunteer";
import { formatOnetimerDate, formatOnetimerTime } from "../../dto/utils";
import { SUGGESTION_ACCOMPANYING_BUILTIN as BUILTIN } from "../builtin-content";
import { createManifestLoader, renderEmail } from "../email-template";
import { resolveAccompaniedPersonLanguage } from "../resolve-accompanied-person-language";
import type { EmailTransport } from "../types";

const loader = createManifestLoader(emailSuggestionAccompanyingManifestUrl);

export function resetSuggestionAccompanyingTemplateCache(): void {
  loader.resetCache();
}

export async function sendEmailSuggestionAccompanying(
  email: EmailTransport,
  ov: OpportunityVolunteer,
  errorTransport: EmailTransport = email,
): Promise<void> {
  const volunteerEmail = ov.volunteer?.person?.email;
  if (!volunteerEmail) {
    throw new Error(
      `sendEmailSuggestionAccompanying: missing email for volunteer ${ov.volunteerId}`,
    );
  }

  const volunteerName = ov.volunteer.person.name;
  const opportunity = ov.opportunity;
  const accompanying = opportunity?.accompanying;

  const appointmentTitle = opportunity?.title ?? "";
  const appointmentAddress = accompanying?.address ?? "";
  const appointmentPlz = accompanying?.postcode?.value ?? "";
  const appointmentDate = formatOnetimerDate(opportunity?.onetimer?.date);
  const appointmentTime = formatOnetimerTime(opportunity?.onetimer?.date);
  const accompaniedpersonLanguage = await resolveAccompaniedPersonLanguage(
    errorTransport,
    accompanying?.languageToTranslate,
    opportunity?.deal?.dealLanguage ?? [],
    `sendEmailSuggestionAccompanying, ov ${ov.id}`,
  );

  const { subject, text, html } = renderEmail(await loader.load(), BUILTIN, {
    volunteerName,
    appointmentTitle,
    appointmentAddress,
    appointmentPlz,
    appointmentDate,
    appointmentTime,
    accompaniedpersonLanguage,
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
