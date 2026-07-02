import { Lang } from "need4deed-sdk";
import {
  emailFromVolunteer,
  emailStaleManifestUrl,
} from "../../../config/constants";
import OpportunityVolunteer from "../../../data/entity/m2m/opportunity-volunteer";
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
    subject: "Are you still interested in volunteering? — Need4Deed",
    text: `Dear {{ volunteerName }},\n\nWe wanted to check in. Two months ago we sent you a volunteering opportunity, but we have not heard back yet.\n\nIf you are still interested in volunteering, please reply to this email.\n\nBest regards,\nNeed4Deed`,
  },
  [Lang.DE]: {
    subject: "Bist du noch interessiert? — Need4Deed",
    text: `Hallo {{ volunteerName }},\n\nwir wollten kurz nachfragen. Vor zwei Monaten haben wir dir eine ehrenamtliche Möglichkeit vorgeschlagen, aber bisher haben wir keine Rückmeldung erhalten.\n\nFalls du weiterhin Interesse hast, antworte bitte auf diese E-Mail.\n\nViele Grüße\nNeed4Deed`,
  },
};

const loader = createManifestLoader(emailStaleManifestUrl);

export function resetStaleTemplateCache(): void {
  loader.resetCache();
}

export async function sendEmailStale(
  email: EmailTransport,
  ov: OpportunityVolunteer,
): Promise<void> {
  const volunteerEmail = ov.volunteer?.person?.email;
  if (!volunteerEmail) {
    throw new Error(
      `sendEmailStale: missing email for volunteer ${ov.volunteerId}`,
    );
  }

  const volunteerName = ov.volunteer.person.name;
  const locale = resolveLocale(ov.volunteer.person?.users?.[0]?.language);
  const content = resolveContent(await loader.load(), locale, BUILTIN);
  const { subject, text, html } = fillTemplate(content, { volunteerName });

  await email.send({
    to: volunteerEmail,
    from: emailFromVolunteer,
    subject,
    ...(text !== undefined ? { text } : {}),
    ...(html !== undefined ? { html } : {}),
  });
}
