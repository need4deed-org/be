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
    "Vorstellung-Vermittlung: {{ volunteerName }} für {{ volunteeringopportunityName }} in {{ agentTitle }}",
  text: `Hallo {{ contactpersonName }}, hallo {{ volunteerName }},\n \nwir möchten euch gerne für die Aktivität „{{ volunteeringopportunityName }}“ einander vorstellen. \n \n{{ volunteerName }} spricht {{ volunteerLanguage }}, hat folgende Fähigkeiten: {{ volunteerSkills }}, die für diese ehrenamtliche Tätigkeit nützlich sein können. \n{{ volunteerName }} ist an folgenden Tagen und zu folgenden Uhrzeiten verfügbar: {{ volSchedule }}.\n \n{{ statmentOnCertificates }}\n \nDie Kontaktdaten von {{ volunteerName }} sind:\n{{ volunteerName }}\n{{ volunteerEmail }}\n{{ volunteerPhone }}\n \nDie Kontaktdaten der Einrichtung sind:\n{{ contactpersonName }}\n{{ contactpersonEmail }}\n{{ contactpersonPhone }}\n{{ agentAddress }}\n \nEs wäre super, wenn Ihr einen Kennenlernentermin vereinbart, um alles in Detail zu besprechen. Bei Fragen könnt ihr euch gerne bei uns melden.\n \n{{ emailNote }}\n \nViele Grüße\nNeed4Deed\ncontact@need4deed.org`,
};

export const ACCOMPANY_MATCH_BUILTIN: LocaleContent = {
  subject:
    "Begleitung zum Termin am {{ appointmentDate }} in {{ appointmentDistrict }} für {{ clientName }}",
  text: `Hallo {{ contactpersonName }},\n \n{{ volunteerName }} übernimmt gerne die Unterstützung bei dem Termin am {{ appointmentDate }}. {{ volunteerName }} spricht {{ volunteerLanguage }}.\n \n{{ volunteerName }} hat schon die Kontaktdaten von {{ clientName }} bekommen und meldet sich zeitnah bei der Person.\n \n{{ contactSharing }}\n \n{{ emailNote }}\n \nViele Grüße\nNeed4Deed`,
};

export const SUGGESTION_BUILTIN: LocaleContent = {
  subject: "Volunteering opportunity match — Need4Deed",
  text: `Dear {{ volunteerName }},\n \nWe have an opportunity that may interest you: {{ opportunityName.en }}, in Berlin {{ plz }}. When: {{ opportunitySchedule.en }}{{ scheduleNote.en }}. If you'd like to volunteer, please reply to volunteer@need4deed.org in the next 10 days.\n\nThe Need4Deed Team :)\nvolunteer@need4deed.org\n\nHallo {{ volunteerName }},\n\nWir haben eine Möglichkeit, die dich interessieren könnte: {{ opportunityName.de }}, in Berlin {{ plz }}. Wann: {{ opportunitySchedule.de }}{{ scheduleNote.de }}.\nWenn du dich ehrenamtlich engagieren möchtest, antworte bitte innerhalb der nächsten 10 Tage an volunteer@need4deed.org.\n\n{{ emailNote }}\n\nDas Need4Deed-Team :)\nvolunteer@need4deed.org`,
};

export const SUGGESTION_ACCOMPANYING_BUILTIN: LocaleContent = {
  subject: "Accompanying opportunity match — Need4Deed",
  text: `Dear {{ volunteerName }},\n \nWe are looking for a volunteer to support for the following appointment:\nTitle: {{ appointmentTitle.en }}\nAddress: {{ appointmentAddress }}, {{ appointmentPlz }}\nDate and time: {{ appointmentDate }} at {{ appointmentTime }}\nLanguage: {{ accompaniedpersonLanguage.en }}\n \nWould it be possible for you to do that? Please let us know by responding to accompanying@need4deed.org.\n\nThe Need4Deed Team :)\n\nHallo {{ volunteerName }},\n \nwir suchen nach einer Person, die Zeit und Lust hätte, bei einem Termin ehrenamtlich zu unterstützen.\nTitel: {{ appointmentTitle.de }}\nAdresse: {{ appointmentAddress }}, {{ appointmentPlz }}\nDatum und Uhrzeit: {{ appointmentDate }} um {{ appointmentTime }}\nSprache: {{ accompaniedpersonLanguage.de }}\n \nWäre es für dich möglich, diese Begleitung zu übernehmen? Antworte bitte an accompanying@need4deed.org.\n\n{{ emailNote }}\n\nDas Need4Deed-Team :)\naccompanying@need4deed.org`,
};

export const REGISTRATION_BUILTIN: LocaleContent = {
  subject: "Danke für deine Registrierung bei Need4Deed",
  text: `Dear {{ volunteerName }},\n \nThank you for registering to support refugees. We will give you a call in the next few days to check what could be a suitable opportunity for you.\n \nBest regards,\nNeed4Deed\n\nHallo {{ volunteerName }},\n \nvielen Dank für deine Registrierung, um Geflüchtete zu unterstützen. Wir rufen dich in den nächsten Tagen an, um zu besprechen, was für dich passen könnte.\n \nViele Grüße\nNeed4Deed`,
};

export const ACCOMPANY_MATCH_VOLUNTEER_BUILTIN: LocaleContent = {
  subject: "Deine Begleitung am {{ appointmentDate }} — Need4Deed",
  text: `Dear {{ volunteerName }},\n \nThank you for taking on this accompanying opportunity. Here are the details:\nTitle: {{ appointmentTitle.en }}\nDate and time: {{ appointmentDate }} at {{ appointmentTime }}\nAddress: {{ appointmentAddress }}, {{ appointmentPlz }}\nAccompanied person: {{ accompaniedpersonName }}, {{ accompaniedpersonPhone }}\nLanguages: {{ accompaniedpersonLanguage.en }}\nAdditional information: {{ appointmentComment }}\n \nIf you have any questions, the contact at the organisation is:\n{{ contactpersonName }}\n{{ contactpersonEmail }}\n{{ contactpersonPhone }}\n \nThank you again for volunteering.\n\nThe Need4Deed Team :)\n\nHallo {{ volunteerName }},\n \nvielen Dank, dass du diese Begleitung übernimmst. Hier sind die Details:\nTitel: {{ appointmentTitle.de }}\nDatum und Uhrzeit: {{ appointmentDate }} um {{ appointmentTime }}\nAdresse: {{ appointmentAddress }}, {{ appointmentPlz }}\nBegleitete Person: {{ accompaniedpersonName }}, {{ accompaniedpersonPhone }}\nSprachen: {{ accompaniedpersonLanguage.de }}\nZusätzliche Informationen: {{ appointmentComment }}\n \nBei Fragen ist der Kontakt bei der Einrichtung:\n{{ contactpersonName }}\n{{ contactpersonEmail }}\n{{ contactpersonPhone }}\n \nVielen Dank für dein Engagement.\n\nDas Need4Deed-Team :)`,
};

export const NEW_REGULAR_BUILTIN: LocaleContent = {
  subject: "Deine Anfrage bei Need4Deed",
  text: `Hallo {{ contactpersonName }},\n \nvielen Dank für deine Anfrage zu “{{ volunteeringopportunityName }}”.\n \nWir fangen bald mit der Suche an.\n \nWenn wir jemanden gefunden haben, melden wir uns bei dir und stellen dir die Person vor.\n \nViele Grüße\nNeed4Deed\ncontact@need4deed.org`,
};

export const NEW_ACCOMPANYING_BUILTIN: LocaleContent = {
  subject:
    "Begleitung zum Termin am {{ appointmentDate }} in {{ appointmentDistrict }} für {{ clientName }}",
  text: `Hallo {{ contactpersonName }},\n \nvielen Dank für die Anfrage.\n \nHier sind die angegebenen Details. Bitte prüfe kurz, ob alles stimmt:\nDatum, Uhrzeit: {{ appointmentDate }} um {{ appointmentTime }}\nName der Person: {{ accompaniedpersonName }}\nRufnummer der Person: {{ accompaniedpersonPhone }}\nAdresse: {{ appointmentAddress }}, {{ appointmentPlz }}\nSprachen: {{ accompaniedpersonLanguage }}\nZusätzliche Informationen: {{ appointmentComment }}\n \nWir überprüfen die Informationen umgehend und melden uns innerhalb von zwei Tagen, falls etwas fehlt.\n \nWir überprüfen, ob wir alle benötigte Informationen haben. Falls ja, leiten wir Deine Anfrage an die Freiwilligen weiter und melden uns bei Dir, sobald wir jemanden für den Termin gefunden haben. \nWenn nicht, werden wir uns bei Dir melden.\n\nFalls wir keine Freiwilligen für den Termin vermitteln können, melden wir uns spätestens vier Werktage vorher.\n \nMehr Informationen über die Leitlinien findest Du unter https://need4deed.org/rac-guidelines\n \nViele Grüße\nNeed4Deed`,
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

export interface TaggedLabels {
  commentOnVolunteer: string;
  commentOnOpportunity: string;
  commentOnAgent: string;
  comment: string;
  post: string;
  someone: string;
  noName: string;
}

export const TAGGED_BUILTIN: Record<
  Lang,
  LocaleContent & { labels: TaggedLabels }
> = {
  [Lang.EN]: {
    subject: "{{ authorName }} tagged you in {{ where }} — Need4Deed",
    text: `Hi {{ recipientName }},\n\n{{ authorName }} tagged you in {{ where }} on the Need4Deed dashboard:\n\n{{ tagText }}\n\nOpen it here: {{ link }}\n\nThe Need4Deed Team`,
    labels: {
      commentOnVolunteer: "a comment on a volunteer",
      commentOnOpportunity: "a comment on an opportunity",
      commentOnAgent: "a comment on an organisation",
      comment: "a comment",
      post: "a post",
      someone: "Someone",
      noName: "there",
    },
  },
  [Lang.DE]: {
    subject: "{{ authorName }} hat dich in {{ where }} markiert — Need4Deed",
    text: `Hallo {{ recipientName }},\n\n{{ authorName }} hat dich im Need4Deed-Dashboard in {{ where }} markiert:\n\n{{ tagText }}\n\nHier geht es direkt dorthin: {{ link }}\n\nViele Grüße\nNeed4Deed`,
    labels: {
      commentOnVolunteer: "einem Kommentar zu einer freiwilligen Person",
      commentOnOpportunity: "einem Kommentar zu einem Gesuch",
      commentOnAgent: "einem Kommentar zu einer Einrichtung",
      comment: "einem Kommentar",
      post: "einem Beitrag",
      someone: "Jemand",
      noName: "zusammen",
    },
  },
};

export const CGC_APPLICATION_BUILTIN: Record<Lang, LocaleContent> = {
  [Lang.EN]: {
    subject: "Your certificate of good conduct application — Need4Deed",
    text: `Hi {{ volunteerName }},\n\nIn order for you to volunteer with a refugee accommodation center, you need a certificate of good conduct which we can apply for on your behalf. Please fill out the attached document "EFZ_Antrag_V" and send it back to us by replying to this email, together with a copy of your passport (Aufenthaltstitel in this case is not a valid form of ID) or a German ID. Our community team ({{ communityEmail }}) is copied.\n\nHere are tips on how to fill it out:\n1. On the top right corner next to "Berlin, der" please write today's date.\n2. Left of "hiermit beantrage ich," please write your first and last name.\n3. "Geb. am": please write your birthday DD.MM.YYYY in State/City and Country of your birth.\n4. "Wohnhaft" is your current Berlin registration address (Anmeldung address).\n5. Under "Mit freundlichen Grüßen," please write your name with an additional signature.\n\nOnce you send us the signed form, we will submit the application to the Bezirksamt and you will receive it by post within 2-4 weeks. Please let us know when you receive it.\n\nAlso to get involved regularly in an accommodation center, you would need to show your vaccine to measles.\n\nWe are also linking our data protection and volunteering policies for your reference:\n{{ dataPrivacyUrl }}\n{{ agreementUrl }}\n\nOnce you have sent us these documents, we will match you with the accommodation center and you can take it from there.\n\nAll the best,\n{{ signature }}`,
  },
  [Lang.DE]: {
    subject: "Dein Antrag auf ein erweitertes Führungszeugnis — Need4Deed",
    text: `Hallo {{ volunteerName }},\n\nfür ein Ehrenamt in einer Unterkunft für Geflüchtete brauchst du ein erweitertes Führungszeugnis, das wir für dich beantragen können. Bitte fülle das angehängte Dokument „EFZ_Antrag_V“ aus und schicke es uns als Antwort auf diese E-Mail zusammen mit einer Kopie deines Reisepasses (ein Aufenthaltstitel ist hier kein gültiger Ausweis) oder deines deutschen Personalausweises. Unser Community-Team ({{ communityEmail }}) ist in Kopie.\n\nSo füllst du das Formular aus:\n1. Oben rechts neben „Berlin, der“ trägst du das heutige Datum ein.\n2. Links neben „hiermit beantrage ich,“ trägst du deinen Vor- und Nachnamen ein.\n3. „Geb. am“: dein Geburtsdatum (TT.MM.JJJJ) sowie Ort/Bundesland und Land deiner Geburt.\n4. „Wohnhaft“ ist deine aktuelle Berliner Meldeadresse (Anmeldung).\n5. Unter „Mit freundlichen Grüßen,“ schreibst du deinen Namen und unterschreibst zusätzlich.\n\nSobald du uns das unterschriebene Formular geschickt hast, reichen wir den Antrag beim Bezirksamt ein. Das Führungszeugnis kommt in 2–4 Wochen per Post zu dir. Bitte gib uns Bescheid, wenn du es erhalten hast.\n\nFür ein regelmäßiges Engagement in einer Unterkunft brauchst du außerdem einen Nachweis über deine Masernimpfung.\n\nHier findest du zur Info unsere Datenschutzerklärung und die Vereinbarung zur ehrenamtlichen Teilnahme:\n{{ dataPrivacyUrl }}\n{{ agreementUrl }}\n\nSobald wir deine Unterlagen haben, vermitteln wir dich an die Unterkunft und du kannst direkt loslegen.\n\nViele Grüße\n{{ signature }}`,
  },
};
