import { Lang } from "need4deed-sdk";
import {
  emailFromNotify,
  emailFromVolunteer,
  emailSuggestionManifestUrl,
} from "../../../config/constants";
import OpportunityVolunteer from "../../../data/entity/m2m/opportunity-volunteer";
import { getTitles } from "../../dto/utils";
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
    subject: "Volunteering opportunity match — Need4Deed",
    text: `Dear {{ volunteerName }},\n\nWe have found a volunteering opportunity that matches your profile.\n\nOpportunity: {{ opportunityName }}\nPostcode: {{ plz }}\nSchedule: {{ schedule }}\n\nIf you are interested, please reply to this email.\n\nBest regards,\nNeed4Deed`,
  },
  [Lang.DE]: {
    subject: "Möglicher Einsatz — Need4Deed",
    text: `Hallo {{ volunteerName }},\n\nwir haben eine ehrenamtliche Möglichkeit gefunden, die zu deinem Profil passt.\n\nGesuch: {{ opportunityName }}\nPostleitzahl: {{ plz }}\nZeiten: {{ schedule }}\n\nFalls du Interesse hast, antworte bitte auf diese E-Mail.\n\nViele Grüße\nNeed4Deed`,
  },
};

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

  const locale = resolveLocale(ov.volunteer.person?.users?.[0]?.language);
  const content = resolveContent(await loader.load(), locale, BUILTIN);
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
