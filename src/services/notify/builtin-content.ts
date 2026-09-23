// Fallback content for every notify email, used when the CDN manifest for
// that email can't be loaded (fetch failure/timeout) or lacks a valid entry
// for the requested locale. Kept in one file so editing copy doesn't require
// hunting through every event file in ./events.
//
// Mirrors dev/files/manifests/*.json (the live CDN content) exactly, so a
// fallback looks the same as the real thing. Most of these are flat — a
// single body used regardless of recipient — either because they're
// German-only (RAC/contact-person workflow) or because they bilingually
// concatenate English+German in one body (volunteer-facing workflow, where
// the recipient's language can't be reliably known; see be#830/#838).
// PASSWORD_RESET_BUILTIN is the one exception still split per locale, since
// no flat manifest was provided for it.
import { Lang } from "need4deed-sdk";
import type { LocaleContent } from "./email-template";

export const STALE_BUILTIN: LocaleContent = {
  subject: "Are you still interested in volunteering? Need4Deed",
  text: `Dear {{ volunteerName }},\n \nWe wanted to check in. Two months ago we sent you a volunteering opportunity, but we have not heard back yet.\n \nIf you are still interested in volunteering, please reply to this email.\n \nBest regards,\nNeed4Deed\n \nHallo {{ volunteerName }},\n \nvor zwei Monaten haben wir dir eine ehrenamtliche Möglichkeit vorgeschlagen, aber bisher haben wir keine Rückmeldung erhalten.\n \nFalls du weiterhin Interesse hast, antworte bitte auf diese E-Mail.\n \nViele Grüße\nNeed4Deed`,
};

export const POST_MATCH_CHECKUP_BUILTIN: LocaleContent = {
  subject: "Checking in: are you still volunteering?",
  text: `Dear {{ volunteerName }},\n \nYou registered with us two months ago, we'd love to know if you're still interested in volunteering. If you are, please reply and we'll try to find you a suitable opportunity.\n \nThank you,\n\nHallo {{ volunteerName }},\n\nDu hast dich vor zwei Monaten bei uns registriert. Wir würden gerne wissen, ob du weiterhin Interesse an einem ehrenamtlichen Engagement hast.\n\nFalls ja, antworte einfach auf diese E-Mail, und wir versuchen, eine passende Möglichkeit für dich zu finden.\n\nNeed4Deed`,
};

export const ACCOMPANY_NOT_FOUND_BUILTIN: LocaleContent = {
  subject:
    "Begleitung zum Termin am {{ appointmentDate }} in {{ appointmentDistrict }} für {{ clientName }}",
  text: `Hallo {{ contactpersonName }},\n \nleider hat sich niemand für die Sprachmittlung gemeldet. Wir haben nun unsere Suche eingestellt.\n \nViele Grüße\nNeed4Deed`,
};

export const REGULAR_UPDATE_BUILTIN: LocaleContent = {
  subject: "Aktualisierung der Suche bei Need4Deed",
  text: `Hallo {{ contactpersonName }},\n \nwir möchten gerne wissen, ob das Gesuch “{{ volunteeringopportunityName }}” noch aktuell ist.\n \nSollten wir innerhalb von 2 Wochen keine Rückmeldung bekommen, werden wir das Gesuch als “Inaktiv” markieren.\n \nWir freuen uns darauf, von Dir zu hören.\n \nViele Grüße\nNeed4Deed`,
};

export const INTRODUCTION_BUILTIN: LocaleContent = {
  subject:
    "Vorstellung — {{ volunteerName }} & {{ volunteeringopportunityName }}",
  text: `Hallo {{ contactpersonName }}, hallo {{ volunteerName }},\n \nwir möchten euch gerne für die Aktivität „{{ volunteeringopportunityName }}“ einander vorstellen. \n \n{{ volunteerName }} spricht {{ volunteerLanguage }}, hat folgende Fähigkeiten: {{ volunteerSkills }}, die für diese ehrenamtliche Tätigkeit nützlich sein können. \n{{ volunteerName }} ist an folgenden Tagen und zu folgenden Uhrzeiten verfügbar: {{ volSchedule }}.\n \n{{ statmentOnCertificates }}\n \nDie Kontaktdaten von {{ volunteerName }} sind:\n{{ volunteerName }}\n{{ volunteerEmail }}\n{{ volunteerPhone }}\n \nDie Kontaktdaten der Einrichtung sind:\n{{ contactpersonName }}\n{{ contactpersonEmail }}\n{{ contactpersonPhone }}\n{{ agentAddress }}\n \nEs wäre super, wenn Ihr einen Kennenlernentermin vereinbart, um alles in Detail zu besprechen. Bei Fragen könnt ihr euch gerne bei uns melden.\n \nViele Grüße\nNeed4Deed\ncontact@need4deed.org`,
};

export const ACCOMPANY_MATCH_BUILTIN: LocaleContent = {
  subject:
    "Begleitung zum Termin am {{ appointmentDate }} in {{ appointmentDistrict }} für {{ clientName }}",
  text: `Hallo {{ contactpersonName }},\n \n{{ volunteerName }} übernimmt gerne die Unterstützung bei dem Termin am {{ appointmentDate }}. {{ volunteerName }} spricht {{ volunteerLanguage }}.\n \n{{ volunteerName }} hat schon die Kontaktdaten von {{ clientName }} bekommen und meldet sich zeitnah bei der Person.\n \n{{ contactSharing }}\n \nViele Grüße\nNeed4Deed`,
};

export const SUGGESTION_BUILTIN: LocaleContent = {
  subject: "Volunteering opportunity match — Need4Deed",
  text: `Dear {{ volunteerName }},\n \nWe have an opportunity that may interest you: {{ opportunityName }}, in Berlin {{ plz }} taking place on {{ opportunitySchedule }}. If you'd like to volunteer, please reply to volunteer@need4deed.org in the next 10 days.\n\nThe Need4Deed Team :)\nvolunteer@need4deed.org\n\nHallo {{ volunteerName }},\n\nWir haben eine Möglichkeit, die dich interessieren könnte: {{ opportunityName }}, in Berlin {{ plz }}, am {{ opportunitySchedule }}.\nWenn du dich ehrenamtlich engagieren möchtest, antworte bitte innerhalb der nächsten 10 Tage an volunteer@need4deed.org.\n\nDas Need4Deed-Team :)\nvolunteer@need4deed.org`,
};

export const SUGGESTION_ACCOMPANYING_BUILTIN: LocaleContent = {
  subject: "Accompanying opportunity match — Need4Deed",
  text: `Dear {{ volunteerName }},\n \nWe have an accompanying opportunity that may interest you:\nTitle: {{ appointmentTitle }}\nAddress: {{ appointmentAddress }}, {{ appointmentPlz }}\nDate and time: {{ appointmentDate }} at {{ appointmentTime }}\n \nIf you'd like to volunteer, please reply to volunteer@need4deed.org in the next 10 days.\n\nThe Need4Deed Team :)\n\nHallo {{ volunteerName }},\n \nwir haben eine Begleitung, die dich interessieren könnte:\nTitel: {{ appointmentTitle }}\nAdresse: {{ appointmentAddress }}, {{ appointmentPlz }}\nDatum und Uhrzeit: {{ appointmentDate }} um {{ appointmentTime }}\n \nWenn du dich ehrenamtlich engagieren möchtest, antworte bitte innerhalb der nächsten 10 Tage an volunteer@need4deed.org.\n\nDas Need4Deed-Team :)\nvolunteer@need4deed.org`,
};

export const REGISTRATION_BUILTIN: LocaleContent = {
  subject: "Danke für deine Registrierung bei Need4Deed",
  text: `Dear {{ volunteerName }},\n \nThank you for registering to support refugees. We will give you a call in the next few days to check what could be a suitable opportunity for you.\n \nBest regards,\nNeed4Deed\n\nHallo {{ volunteerName }},\n \nvielen Dank für deine Registrierung, um Geflüchtete zu unterstützen. Wir rufen dich in den nächsten Tagen an, um zu besprechen, was für dich passen könnte.\n \nViele Grüße\nNeed4Deed`,
};

export const ACCOMPANY_MATCH_VOLUNTEER_BUILTIN: LocaleContent = {
  subject: "Deine Begleitung am {{ appointmentDate }} — Need4Deed",
  text: `Dear {{ volunteerName }},\n \nThank you for taking on this accompanying opportunity. Here are the details:\nTitle: {{ appointmentTitle }}\nDate and time: {{ appointmentDate }} at {{ appointmentTime }}\nAddress: {{ appointmentAddress }}, {{ appointmentPlz }}\nAccompanied person: {{ accompaniedpersonName }}, {{ accompaniedpersonPhone }}\nLanguages: {{ accompaniedpersonLanguage }}, {{ appointmentaLanguage }}\nAdditional information: {{ appointmentComment }}\n \nIf you have any questions, the contact at the organisation is:\n{{ contactpersonName }}\n{{ contactpersonEmail }}\n{{ contactpersonPhone }}\n \nThank you again for volunteering.\n\nThe Need4Deed Team :)\n\nHallo {{ volunteerName }},\n \nvielen Dank, dass du diese Begleitung übernimmst. Hier sind die Details:\nTitel: {{ appointmentTitle }}\nDatum und Uhrzeit: {{ appointmentDate }} um {{ appointmentTime }}\nAdresse: {{ appointmentAddress }}, {{ appointmentPlz }}\nBegleitete Person: {{ accompaniedpersonName }}, {{ accompaniedpersonPhone }}\nSprachen: {{ accompaniedpersonLanguage }}, {{ appointmentaLanguage }}\nZusätzliche Informationen: {{ appointmentComment }}\n \nBei Fragen ist der Kontakt bei der Einrichtung:\n{{ contactpersonName }}\n{{ contactpersonEmail }}\n{{ contactpersonPhone }}\n \nVielen Dank für dein Engagement.\n\nDas Need4Deed-Team :)`,
};

export const NEW_REGULAR_BUILTIN: LocaleContent = {
  subject: "Deine Anfrage bei Need4Deed",
  text: `Hallo {{ contactpersonName }},\n \nvielen Dank für deine Anfrage zu “{{ volunteeringopportunityName }}”.\n \nWir fangen bald mit der Suche an.\n \nWenn wir jemanden gefunden haben, melden wir uns bei dir und stellen dir die Person vor.\n \nViele Grüße\nNeed4Deed\ncontact@need4deed.org`,
};

export const NEW_ACCOMPANYING_BUILTIN: LocaleContent = {
  subject:
    "Begleitung zum Termin am {{ appointmentDate }} in {{ appointmentDistrict }} für {{ clientName }}",
  text: `Hallo {{ contactpersonName }},\n \nvielen Dank für die Anfrage.\n \nHier sind die angegebenen Details. Bitte prüfe kurz, ob alles stimmt:\nDatum, Uhrzeit: {{ appointmentDate }} um {{ appointmentTime }}\nName der Person: {{ accompaniedpersonName }}\nRufnummer der Person: {{ accompaniedpersonPhone }}\nAdresse: {{ appointmentAddress }}, {{ appointmentPlz }}\nSprachen: {{ accompaniedpersonLanguage }}, {{ appointmentaLanguage }}\nZusätzliche Informationen: {{ appointmentComment }}\n \nWir überprüfen die Informationen umgehend und melden uns innerhalb von zwei Tagen, falls etwas fehlt.\n \nWir überprüfen, ob wir alle benötigte Informationen haben. Falls ja, leiten wir Deine Anfrage an die Freiwilligen weiter und melden uns bei Dir, sobald wir jemanden für den Termin gefunden haben. \nWenn nicht, werden wir uns bei Dir melden.\n\nFalls wir keine Freiwilligen für den Termin vermitteln können, melden wir uns spätestens vier Werktage vorher.\n \nMehr Informationen über die Leitlinien findest Du unter https://need4deed.org/rac-guidelines\n \nViele Grüße\nNeed4Deed`,
};

export const VERIFICATION_BUILTIN: LocaleContent = {
  subject: "Verify your Need4Deed account email",
  html: `<p>Dein Konto wurde erfolgreich erstellt. Bitte bestätige deine E-Mail-Adresse:</p><p><a href="{{verificationUrl}}">{{verificationUrl}}</a></p>\n\n\n\n<p>Your account has been created successfully. Please verify your email:</p><p><a href="{{verificationUrl}}">{{verificationUrl}}</a></p>`,
  text: `Dein Konto wurde erfolgreich erstellt. Bitte bestätige deine E-Mail-Adresse:\n{{verificationUrl}}\n\nYour account has been created successfully. Please verify your email:\n{{verificationUrl}}`,
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
