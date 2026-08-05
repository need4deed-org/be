// Fallback content for every notify email, used when the CDN manifest for
// that email can't be loaded (fetch failure/timeout) or lacks a valid entry
// for the requested locale. Kept in one file so editing copy doesn't require
// hunting through every event file in ./events.
import { Lang } from "need4deed-sdk";
import type { LocaleContent } from "./email-template";

export const STALE_BUILTIN: Record<Lang, LocaleContent> = {
  [Lang.EN]: {
    subject: "Are you still interested in volunteering? — Need4Deed",
    text: `Dear {{ volunteerName }},\n\nWe wanted to check in. Two months ago we sent you a volunteering opportunity, but we have not heard back yet.\n\nIf you are still interested in volunteering, please reply to this email.\n\nBest regards,\nNeed4Deed`,
  },
  [Lang.DE]: {
    subject: "Bist du noch interessiert? — Need4Deed",
    text: `Hallo {{ volunteerName }},\n\nwir wollten kurz nachfragen. Vor zwei Monaten haben wir dir eine ehrenamtliche Möglichkeit vorgeschlagen, aber bisher haben wir keine Rückmeldung erhalten.\n\nFalls du weiterhin Interesse hast, antworte bitte auf diese E-Mail.\n\nViele Grüße\nNeed4Deed`,
  },
};

export const POST_MATCH_CHECKUP_BUILTIN: Record<Lang, LocaleContent> = {
  [Lang.EN]: {
    subject: "Checking in — are you still volunteering?",
    text: `Dear {{ volunteerName }},\n\nWe wanted to check in. You were matched two months ago, have you had the chance to volunteer and are you still active?\n\nLet us know by replying to this email so we can keep your profile up to date.\n\nThank you,\nNeed4Deed`,
  },
  [Lang.DE]: {
    subject: "Kurze Nachfrage — bist du noch aktiv?",
    text: `Hallo {{ volunteerName }},\n\nwir wollten kurz nachfragen. Du wurdest vor zwei Monaten vermittelt — hattest du die Gelegenheit, dich ehrenamtlich zu engagieren, und bist du noch aktiv?\n\nBitte antworte einfach auf diese E-Mail, damit wir dein Profil aktuell halten können.\n\nVielen Dank\nNeed4Deed`,
  },
};

export const ACCOMPANY_NOT_FOUND_BUILTIN: Record<Lang, LocaleContent> = {
  [Lang.EN]: {
    subject:
      "Accompanying to an appointment on {{ appointmentDate }} in {{ appointmentDistrict }} for {{ clientName }}",
    text: `Dear {{ contactpersonName }},\n\nUnfortunately, we were unable to find a volunteer for this appointment. We have now called off our search.\n\nBest regards,\nNeed4Deed`,
  },
  [Lang.DE]: {
    subject:
      "Begleitung zum Termin am {{ appointmentDate }} in {{ appointmentDistrict }} für {{ clientName }}",
    text: `Hallo {{ contactpersonName }},\n\nleider hat sich niemand für die Sprachmittlung gemeldet. Wir haben nun unsere Suche eingestellt.\n\nViele Grüße\nNeed4Deed`,
  },
};

export const REGULAR_UPDATE_BUILTIN: Record<Lang, LocaleContent> = {
  [Lang.EN]: {
    subject: "Status of your volunteering opportunity — Need4Deed",
    text: `Dear {{ contactpersonName }},\n\nWe are checking in to see if you are still looking for volunteers for "{{ volunteeringopportunityName }}".\n\nPlease let us know within two weeks. Otherwise we will mark this volunteering opportunity as inactive in our system.\n\nBest regards,\nNeed4Deed`,
  },
  [Lang.DE]: {
    subject: "Aktualisierung der Gesuche bei Need4Deed",
    text: `Hallo {{ contactpersonName }},\n\nwir möchten gerne wissen, ob das Gesuch "{{ volunteeringopportunityName }}" noch aktuell ist.\n\nSollten wir innerhalb von 2 Wochen keine Rückmeldung bekommen, werden wir das Gesuch als "Inaktiv" markieren.\n\nWir freuen uns darauf, von Dir zu hören.\n\nViele Grüße\nNeed4Deed`,
  },
};

export const INTRODUCTION_BUILTIN: Record<Lang, LocaleContent> = {
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

export const ACCOMPANY_MATCH_BUILTIN: Record<Lang, LocaleContent> = {
  [Lang.EN]: {
    subject:
      "Accompanying to an appointment on {{ appointmentDate }} in {{ appointmentDistrict }} for {{ clientName }}",
    text: `Dear {{ contactpersonName }},\n\n{{ volunteerName }} would be glad to provide interpreting support for this appointment. {{ volunteerName }} speaks {{ volunteerLanguage }}.\n\n{{ volunteerName }} has already received {{ clientName }}'s contact details and will get in touch with them shortly.\n\n{{ contactSharing }}\n\nBest regards,\nNeed4Deed`,
  },
  [Lang.DE]: {
    subject:
      "Begleitung zum Termin am {{ appointmentDate }} in {{ appointmentDistrict }} für {{ clientName }}",
    text: `Hallo {{ contactpersonName }},\n\n{{ volunteerName }} übernimmt gerne die Sprachmittlung für diesen Termin. {{ volunteerName }} spricht {{ volunteerLanguage }}.\n\n{{ volunteerName }} hat schon die Kontaktdaten von {{ clientName }} bekommen und meldet sich zeitnah bei der Person.\n\n{{ contactSharing }}\n\nViele Grüße\nNeed4Deed`,
  },
};

export const SUGGESTION_BUILTIN: Record<Lang, LocaleContent> = {
  [Lang.EN]: {
    subject: "Volunteering opportunity match — Need4Deed",
    text: `Dear {{ volunteerName }},\n\nWe have found a volunteering opportunity that matches your profile.\n\nOpportunity: {{ opportunityName }}\nPostcode: {{ plz }}\nSchedule: {{ schedule }}\n\nIf you are interested, please reply to this email.\n\nBest regards,\nNeed4Deed`,
  },
  [Lang.DE]: {
    subject: "Möglicher Einsatz — Need4Deed",
    text: `Hallo {{ volunteerName }},\n\nwir haben eine ehrenamtliche Möglichkeit gefunden, die zu deinem Profil passt.\n\nGesuch: {{ opportunityName }}\nPostleitzahl: {{ plz }}\nZeiten: {{ schedule }}\n\nFalls du Interesse hast, antworte bitte auf diese E-Mail.\n\nViele Grüße\nNeed4Deed`,
  },
};

export const NEW_REGULAR_BUILTIN: Record<Lang, LocaleContent> = {
  [Lang.EN]: {
    subject: "Your request to Need4Deed",
    text: `Dear {{ contactpersonName }},\n\nThank you for sending us your volunteering opportunity "{{ volunteeringopportunityName }}".\n\nWe will start looking for volunteers as soon as possible.\n\nWe will let you know when we find someone and introduce the volunteer to you.\n\nBest regards,\nNeed4Deed`,
  },
  [Lang.DE]: {
    subject: "Deine Anfrage bei Need4Deed",
    text: `Hallo {{ contactpersonName }},\n\nvielen Dank für deine Anfrage zu "{{ volunteeringopportunityName }}".\n\nWir fangen bald mit der Suche an.\n\nWenn wir jemanden gefunden haben, melden wir uns bei dir und stellen dir die Person vor.\n\nViele Grüße\nNeed4Deed`,
  },
};

export const NEW_ACCOMPANYING_BUILTIN: Record<Lang, LocaleContent> = {
  [Lang.EN]: {
    subject:
      "Accompanying appointment on {{ appointmentDate }} in {{ appointmentDistrict }} for {{ clientName }}",
    text: `Dear {{ contactpersonName }},\n\nThank you for your request.\n\nHere are the details you provided. Please check that everything is correct:\n {{ appointmentTitle }}\n {{ appointmentDistrict }}\n {{ appointmentDate }} at {{ appointmentTime }}\n {{ appointmentAddress }}, {{ appointmentPlz }}\n {{ accompaniedpersonLanguage }}\n{{ appointmentaLanguage }}\n{{ accompaniedpersonName }}\n{{ accompaniedpersonPhone }}\n{{ appointmentComment }}\n\nWe will review the information promptly and get back to you within two days if anything is missing.\n\nIf all the details are correct and the accompaniment is straightforward (e.g. not a hospital treatment, a brief description is provided, and a direct phone number of the contact person is available), we will forward your request to our volunteers. We will get back to you once we have found someone for the appointment.\nIf we are unable to find a volunteer for the appointment, we will let you know no later than four working days beforehand.\n\nMore information about our guidelines can be found at https://need4deed.org/rac-guidelines\n\nBest regards,\nThe Team`,
  },
  [Lang.DE]: {
    subject:
      "Begleitung zum Termin am {{ appointmentDate }} in {{ appointmentDistrict }} für {{ clientName }}",
    text: `Hallo {{ contactpersonName }},\n\nvielen Dank für die Anfrage.\n\nHier sind die angegebenen Details. Bitte prüfe kurz, ob alles stimmt:\n {{ appointmentTitle }}\n {{ appointmentDistrict }}\n {{ appointmentDate }} um {{ appointmentTime }}\n {{ appointmentAddress }}, {{ appointmentPlz }}\n {{ accompaniedpersonLanguage }}\n{{ appointmentaLanguage }}\n{{ accompaniedpersonName }}\n{{ accompaniedpersonPhone }}\n{{ appointmentComment }}\n\nWir überprüfen die Informationen umgehend und melden uns innerhalb von zwei Tagen, falls etwas fehlt.\n\nFalls alle Angaben korrekt sind und die Begleitung klar ist (z. B. keine Krankenhausbehandlung, kurze Beschreibung und verfügbare Direktnummer der begleitenden Person), leiten wir deine Anfrage an die Freiwilligen weiter. Wir melden uns, sobald wir jemanden für den Termin gefunden haben.\nFalls wir keine Freiwilligen für den Termin vermitteln können, melden wir uns spätestens vier Werktage vorher.\n\nMehr Informationen über die Leitlinien findest Du unter https://need4deed.org/rac-guidelines\n\nViele Grüße\nDas Team`,
  },
};

export const VERIFICATION_BUILTIN: Record<Lang, LocaleContent> = {
  [Lang.EN]: {
    subject: "Account Created",
    text: `Your account has been created successfully. Please verify your email:\n{{verificationUrl}}`,
    html: `<p>Your account has been created successfully. Please verify your email:</p><p><a href="{{verificationUrl}}">{{verificationUrl}}</a></p>`,
  },
  [Lang.DE]: {
    subject: "Konto erstellt",
    text: `Dein Konto wurde erfolgreich erstellt. Bitte bestätige deine E-Mail:\n{{verificationUrl}}`,
    html: `<p>Dein Konto wurde erfolgreich erstellt. Bitte bestätige deine E-Mail:</p><p><a href="{{verificationUrl}}">{{verificationUrl}}</a></p>`,
  },
};

export const PASSWORD_RESET_BUILTIN: Record<Lang, LocaleContent> = {
  [Lang.EN]: {
    subject: "Password Reset",
    text: `A password reset has been requested for your account. To reset your password, follow this link:\n{{resetUrl}}\n\nIf you did not request this, please ignore this email.`,
    html: `<p>A password reset has been requested for your account.</p>\n<p><a href="{{resetUrl}}">Reset your password</a></p>\n<p>If you did not request this, please ignore this email.</p>`,
  },
  [Lang.DE]: {
    subject: "Passwort zurücksetzen",
    text: `Es wurde ein Zurücksetzen des Passworts für dein Konto angefordert. Um dein Passwort zurückzusetzen, folge diesem Link:\n{{resetUrl}}\n\nFalls du dies nicht angefordert hast, ignoriere diese E-Mail bitte.`,
    html: `<p>Es wurde ein Zurücksetzen des Passworts für dein Konto angefordert.</p>\n<p><a href="{{resetUrl}}">Passwort zurücksetzen</a></p>\n<p>Falls du dies nicht angefordert hast, ignoriere diese E-Mail bitte.</p>`,
  },
};
