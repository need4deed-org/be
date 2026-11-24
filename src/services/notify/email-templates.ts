import { EmailTemplateName, Lang } from "need4deed-sdk";
import {
  emailAccompanyMatchManifestUrl,
  emailAccompanyMatchVolunteerManifestUrl,
  emailAccompanyNotFoundManifestUrl,
  emailCgcApplicationManifestUrl,
  emailIntroductionManifestUrl,
  emailNewAccompanyingManifestUrl,
  emailNewRegularManifestUrl,
  emailPasswordResetManifestUrl,
  emailPostMatchCheckupManifestUrl,
  emailRegistrationManifestUrl,
  emailRegularUpdateManifestUrl,
  emailStaleManifestUrl,
  emailSuggestionAccompanyingManifestUrl,
  emailSuggestionManifestUrl,
  emailSuggestionRequestManifestUrl,
  emailTaggedManifestUrl,
  emailVerificationManifestUrl,
} from "../../config/constants";
import {
  ACCOMPANY_MATCH_BUILTIN,
  ACCOMPANY_MATCH_VOLUNTEER_BUILTIN,
  ACCOMPANY_NOT_FOUND_BUILTIN,
  CGC_APPLICATION_BUILTIN,
  INTRODUCTION_BUILTIN,
  NEW_ACCOMPANYING_BUILTIN,
  NEW_REGULAR_BUILTIN,
  PASSWORD_RESET_BUILTIN,
  POST_MATCH_CHECKUP_BUILTIN,
  REGISTRATION_BUILTIN,
  REGULAR_UPDATE_BUILTIN,
  STALE_BUILTIN,
  SUGGESTION_ACCOMPANYING_BUILTIN,
  SUGGESTION_BUILTIN,
  SUGGESTION_REQUEST_BUILTIN,
  TAGGED_BUILTIN,
  VERIFICATION_BUILTIN,
} from "./builtin-content";
import {
  CachedLoader,
  createManifestLoader,
  LocaleContent,
  Manifest,
  TemplateVar,
} from "./email-template";

const PLACEHOLDERS = {
  [EmailTemplateName.ACCOMPANY_MATCH]: [
    "contactpersonName",
    "volunteerName",
    "volunteerLanguage",
    "clientName",
    "appointmentDate",
    "appointmentDistrict",
    "volunteerEmail",
    "volunteerPhone",
    "contactSharing",
  ],
  [EmailTemplateName.ACCOMPANY_MATCH_VOLUNTEER]: [
    "volunteerName",
    "appointmentTitle",
    "appointmentAddress",
    "appointmentPlz",
    "appointmentDate",
    "appointmentTime",
    "accompaniedpersonName",
    "accompaniedpersonPhone",
    "accompaniedpersonLanguage",
    "appointmentComment",
    "contactpersonName",
    "contactpersonEmail",
    "contactpersonPhone",
  ],
  [EmailTemplateName.ACCOMPANY_NOT_FOUND]: [
    "contactpersonName",
    "appointmentDate",
    "appointmentDistrict",
    "clientName",
  ],
  [EmailTemplateName.CGC_APPLICATION]: [
    "volunteerName",
    "signature",
    "communityEmail",
    "dataPrivacyUrl",
    "agreementUrl",
  ],
  [EmailTemplateName.CHECKUP]: ["volunteerName"],
  [EmailTemplateName.CONFIRMATION]: [
    "contactpersonName",
    "volunteeringopportunityName",
  ],
  [EmailTemplateName.CONFIRMATION_ACCOMPANYING]: [
    "contactpersonName",
    "appointmentDate",
    "appointmentTime",
    "appointmentDistrict",
    "appointmentPlz",
    "clientName",
    "appointmentTitle",
    "appointmentAddress",
    "accompaniedpersonLanguage",
    "accompaniedpersonName",
    "accompaniedpersonPhone",
    "appointmentComment",
    "appointmentaLanguage",
  ],
  [EmailTemplateName.INTRODUCTION]: [
    "contactpersonName",
    "volunteerName",
    "volunteeringopportunityName",
    "volunteerSkills",
    "volSchedule",
    "volunteerLanguage",
    "volunteerEmail",
    "volunteerPhone",
    "contactpersonEmail",
    "contactpersonPhone",
    "agentAddress",
    "agentTitle",
    "opportunityAddress",
    "statmentOnCertificates",
  ],
  [EmailTemplateName.PASSWORD_RESET]: ["resetUrl"],
  [EmailTemplateName.REGISTRATION]: ["volunteerName"],
  [EmailTemplateName.STALE]: ["volunteerName"],
  [EmailTemplateName.SUGGESTION]: [
    "volunteerName",
    "opportunityName",
    "plz",
    "opportunitySchedule",
    "schedule",
    "scheduleNote",
  ],
  [EmailTemplateName.SUGGESTION_ACCOMPANYING]: [
    "volunteerName",
    "appointmentTitle",
    "appointmentAddress",
    "appointmentPlz",
    "appointmentDate",
    "appointmentTime",
    "accompaniedpersonLanguage",
  ],
  [EmailTemplateName.SUGGESTION_REQUEST]: [
    "recipientName",
    "requesterName",
    "requesterAgent",
    "volunteerName",
    "opportunityTitle",
    "link",
  ],
  [EmailTemplateName.TAGGED]: [
    "recipientName",
    "authorName",
    "tagText",
    "where",
    "link",
  ],
  [EmailTemplateName.UPDATE]: [
    "contactpersonName",
    "volunteeringopportunityName",
  ],
  [EmailTemplateName.VERIFICATION]: ["verificationUrl"],
} as const satisfies Record<EmailTemplateName, readonly string[]>;

export type EmailTemplateVars<N extends EmailTemplateName> = Record<
  (typeof PLACEHOLDERS)[N][number],
  TemplateVar
>;

export const EMAIL_NOTE_PLACEHOLDER = "emailNote";

const WITH_EMAIL_NOTE = new Set<EmailTemplateName>([
  EmailTemplateName.ACCOMPANY_MATCH,
  EmailTemplateName.INTRODUCTION,
  EmailTemplateName.SUGGESTION,
  EmailTemplateName.SUGGESTION_ACCOMPANYING,
]);

type Builtin =
  | LocaleContent
  | Record<Lang, LocaleContent & { labels?: object }>;

const SOURCES: Record<EmailTemplateName, { url: string; builtin: Builtin }> = {
  [EmailTemplateName.ACCOMPANY_MATCH]: {
    url: emailAccompanyMatchManifestUrl,
    builtin: ACCOMPANY_MATCH_BUILTIN,
  },
  [EmailTemplateName.ACCOMPANY_MATCH_VOLUNTEER]: {
    url: emailAccompanyMatchVolunteerManifestUrl,
    builtin: ACCOMPANY_MATCH_VOLUNTEER_BUILTIN,
  },
  [EmailTemplateName.ACCOMPANY_NOT_FOUND]: {
    url: emailAccompanyNotFoundManifestUrl,
    builtin: ACCOMPANY_NOT_FOUND_BUILTIN,
  },
  [EmailTemplateName.CGC_APPLICATION]: {
    url: emailCgcApplicationManifestUrl,
    builtin: CGC_APPLICATION_BUILTIN,
  },
  [EmailTemplateName.CHECKUP]: {
    url: emailPostMatchCheckupManifestUrl,
    builtin: POST_MATCH_CHECKUP_BUILTIN,
  },
  [EmailTemplateName.CONFIRMATION]: {
    url: emailNewRegularManifestUrl,
    builtin: NEW_REGULAR_BUILTIN,
  },
  [EmailTemplateName.CONFIRMATION_ACCOMPANYING]: {
    url: emailNewAccompanyingManifestUrl,
    builtin: NEW_ACCOMPANYING_BUILTIN,
  },
  [EmailTemplateName.INTRODUCTION]: {
    url: emailIntroductionManifestUrl,
    builtin: INTRODUCTION_BUILTIN,
  },
  [EmailTemplateName.PASSWORD_RESET]: {
    url: emailPasswordResetManifestUrl,
    builtin: PASSWORD_RESET_BUILTIN,
  },
  [EmailTemplateName.REGISTRATION]: {
    url: emailRegistrationManifestUrl,
    builtin: REGISTRATION_BUILTIN,
  },
  [EmailTemplateName.STALE]: {
    url: emailStaleManifestUrl,
    builtin: STALE_BUILTIN,
  },
  [EmailTemplateName.SUGGESTION]: {
    url: emailSuggestionManifestUrl,
    builtin: SUGGESTION_BUILTIN,
  },
  [EmailTemplateName.SUGGESTION_ACCOMPANYING]: {
    url: emailSuggestionAccompanyingManifestUrl,
    builtin: SUGGESTION_ACCOMPANYING_BUILTIN,
  },
  [EmailTemplateName.SUGGESTION_REQUEST]: {
    url: emailSuggestionRequestManifestUrl,
    builtin: SUGGESTION_REQUEST_BUILTIN,
  },
  [EmailTemplateName.TAGGED]: {
    url: emailTaggedManifestUrl,
    builtin: TAGGED_BUILTIN,
  },
  [EmailTemplateName.UPDATE]: {
    url: emailRegularUpdateManifestUrl,
    builtin: REGULAR_UPDATE_BUILTIN,
  },
  [EmailTemplateName.VERIFICATION]: {
    url: emailVerificationManifestUrl,
    builtin: VERIFICATION_BUILTIN,
  },
};

export interface EmailTemplateDefinition {
  name: EmailTemplateName;
  url: string;
  storageKey: string;
  loader: CachedLoader<Manifest | null>;
  builtin: Builtin;
  placeholders: readonly string[];
  labelKeys: string[];
}

function builtinContents(builtin: Builtin): LocaleContent[] {
  return "subject" in builtin && typeof builtin.subject === "string"
    ? [builtin as LocaleContent]
    : Object.values(builtin as Record<Lang, LocaleContent>);
}

function labelKeysOf(builtin: Builtin): string[] {
  const keys = builtinContents(builtin).flatMap((content) =>
    Object.keys((content as { labels?: object }).labels ?? {}),
  );
  return [...new Set(keys)];
}

export const EMAIL_TEMPLATES = Object.fromEntries(
  Object.values(EmailTemplateName).map((name) => {
    const { url, builtin } = SOURCES[name];
    const definition: EmailTemplateDefinition = {
      name,
      url,
      storageKey: `emails/${name}.json`,
      loader: createManifestLoader(url),
      builtin,
      placeholders: WITH_EMAIL_NOTE.has(name)
        ? [...PLACEHOLDERS[name], EMAIL_NOTE_PLACEHOLDER]
        : PLACEHOLDERS[name],
      labelKeys: labelKeysOf(builtin),
    };
    return [name, definition];
  }),
) as Record<EmailTemplateName, EmailTemplateDefinition>;

export function builtinContentsOf(name: EmailTemplateName): LocaleContent[] {
  return builtinContents(EMAIL_TEMPLATES[name].builtin);
}
