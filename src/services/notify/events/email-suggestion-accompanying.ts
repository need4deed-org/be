import {
  emailFromAccompanying,
  emailFromNotify,
  emailSuggestionAccompanyingManifestUrl,
} from "../../../config/constants";
import OpportunityVolunteer from "../../../data/entity/m2m/opportunity-volunteer";
import {
  formatAccompaniedPersonLanguage,
  formatOnetimerDate,
  formatOnetimerTime,
  getLanguages,
} from "../../dto/utils";
import { SUGGESTION_ACCOMPANYING_BUILTIN as BUILTIN } from "../builtin-content";
import {
  createManifestLoader,
  fillTemplate,
  resolveFlatContent,
} from "../email-template";
import { DEAL_LANGUAGE_LABELS, resolveOrAlert } from "../resolve-or-alert";
import type { EmailTransport } from "../types";

const loader = createManifestLoader(emailSuggestionAccompanyingManifestUrl);

export function resetSuggestionAccompanyingTemplateCache(): void {
  loader.resetCache();
}

// Counterpart to sendEmailSuggestion for ACCOMPANYING opportunities. Unlike a
// regular opportunity's recurring dealTimeslot, an accompanying opportunity
// has a single confirmed appointment (Opportunity.onetimer.date) set at
// creation — so this reads that instead of a schedule, same formatting
// convention as email-new-accompanying.ts/email-accompany-match.ts.
export async function sendEmailSuggestionAccompanying(
  email: EmailTransport,
  ov: OpportunityVolunteer,
  // Bypasses dry-run redirection, same as ValidatingEmailTransport's
  // errorTransport (be#847) — defaults to `email` for callers that don't
  // care about that distinction (e.g. tests with a single mock transport).
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
  const dealLanguageTitles = await resolveOrAlert(
    errorTransport,
    opportunity?.deal?.dealLanguage ?? [],
    (dealLanguage) => getLanguages(dealLanguage).map((l) => l.title),
    [] as string[],
    `sendEmailSuggestionAccompanying, ov ${ov.id}`,
    DEAL_LANGUAGE_LABELS,
  );
  const accompaniedpersonLanguage = formatAccompaniedPersonLanguage(
    accompanying?.languageToTranslate,
    dealLanguageTitles,
  );

  const content = resolveFlatContent(await loader.load(), BUILTIN);
  const { subject, text, html } = fillTemplate(content, {
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
    // Accompanying-specific reply address, not emailFromVolunteer — the
    // template text tells the volunteer to reply to accompanying@, not
    // volunteer@ (regular suggestions still use emailFromVolunteer).
    cc: emailFromAccompanying,
    from: emailFromNotify,
    subject,
    ...(text !== undefined ? { text } : {}),
    ...(html !== undefined ? { html } : {}),
  });
}
