import {
  emailFromNotify,
  emailFromVolunteer,
  emailSuggestionManifestUrl,
} from "../../../config/constants";
import OpportunityVolunteer from "../../../data/entity/m2m/opportunity-volunteer";
import { getTitles } from "../../dto/utils";
import { SUGGESTION_BUILTIN as BUILTIN } from "../builtin-content";
import {
  createManifestLoader,
  fillTemplate,
  resolveFlatContent,
} from "../email-template";
import type { EmailTransport } from "../types";

const loader = createManifestLoader(emailSuggestionManifestUrl);

export function resetSuggestionTemplateCache(): void {
  loader.resetCache();
}

export async function sendEmailSuggestion(
  email: EmailTransport,
  ov: OpportunityVolunteer,
): Promise<void> {
  const volunteerEmail = ov.volunteer?.person?.email;
  if (!volunteerEmail) {
    throw new Error(
      `sendEmailSuggestion: missing email for volunteer ${ov.volunteerId}`,
    );
  }

  const volunteerName = ov.volunteer.person.name;
  const opportunityName = ov.opportunity?.title ?? "";
  const plz = ov.volunteer.deal?.postcode?.value ?? "";
  const schedule =
    getTitles(ov.volunteer.deal?.dealTimeslot ?? [], "timeslot")
      .map((t) => String(t))
      .join(", ") || "";

  const content = resolveFlatContent(await loader.load(), BUILTIN);
  const { subject, text, html } = fillTemplate(content, {
    volunteerName,
    opportunityName,
    plz,
    schedule,
  });

  await email.send({
    to: volunteerEmail,
    cc: emailFromVolunteer,
    from: emailFromNotify,
    subject,
    ...(text !== undefined ? { text } : {}),
    ...(html !== undefined ? { html } : {}),
  });
}
