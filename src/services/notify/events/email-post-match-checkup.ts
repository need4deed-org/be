import { Lang } from "need4deed-sdk";
import {
  emailFromVolunteer,
  emailPostMatchCheckupManifestUrl,
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
    subject: "Checking in — are you still volunteering?",
    text: `Dear {{ volunteerName }},\n\nWe wanted to check in. You were matched two months ago, have you had the chance to volunteer and are you still active?\n\nLet us know by replying to this email so we can keep your profile up to date.\n\nThank you,\nNeed4Deed`,
  },
  [Lang.DE]: {
    subject: "Kurze Nachfrage — bist du noch aktiv?",
    text: `Hallo {{ volunteerName }},\n\nwir wollten kurz nachfragen. Du wurdest vor zwei Monaten vermittelt — hattest du die Gelegenheit, dich ehrenamtlich zu engagieren, und bist du noch aktiv?\n\nBitte antworte einfach auf diese E-Mail, damit wir dein Profil aktuell halten können.\n\nVielen Dank\nNeed4Deed`,
  },
};

const loader = createManifestLoader(emailPostMatchCheckupManifestUrl);

export function resetPostMatchCheckupTemplateCache(): void {
  loader.resetCache();
}

export async function sendEmailPostMatchCheckup(
  email: EmailTransport,
  ov: OpportunityVolunteer,
): Promise<void> {
  const volunteerEmail = ov.volunteer?.person?.email;
  if (!volunteerEmail) {
    throw new Error(
      `sendEmailPostMatchCheckup: missing email for volunteer ${ov.volunteerId}`,
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
