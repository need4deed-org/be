import { ApiEventN4DGet, ApiEventN4DGetList, Lang } from "need4deed-sdk";
import EventN4D from "../../data/entity/event/event.entity";

export function resolveEventTranslation(event: EventN4D, language: Lang) {
  const translations = event.eventTranslation ?? [];
  return (
    translations.find((t) => t.language?.isoCode === language) ??
    translations.find((t) => t.languageId === event.languageId) ??
    translations.reduce<(typeof translations)[number] | undefined>(
      (lowest, t) => (!lowest || t.id < lowest.id ? t : lowest),
      undefined,
    )
  );
}

function sanitizeAdditionalInfo(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  return value.every((item) => typeof item === "string") ? value : undefined;
}

export type ResolvedEventTranslation = ReturnType<
  typeof resolveEventTranslation
>;

export function dtoEventN4DGetList(
  event: EventN4D,
  translation: ResolvedEventTranslation,
  isPrivileged: boolean,
): ApiEventN4DGetList | null {
  if (!translation && !isPrivileged) {
    return null;
  }

  return {
    id: event.id,
    active: event.isActive,
    title: translation?.title ?? "",
    subTitle: translation?.subtitle,
    menuTitle: translation?.menuTitle ?? "",
    date: event.date,
    dateEnd: event.dateEnd,
    type: event.type,
    pic: event.pic,
    address: event.address,
    locationComment: translation?.locationComment,
    description: translation?.description ?? "",
    shortDescription: translation?.shortDescription ?? "",
    linkRSVP: event.rsvpLink,
    hostName: event.hostName,
    additionalTitle: translation?.additionalTitle,
    additionalInfo: sanitizeAdditionalInfo(translation?.additionalInfo),
  };
}

export function dtoEventN4DGet(
  event: EventN4D,
  language: Lang,
  isPrivileged: boolean,
): ApiEventN4DGet | null {
  const translation = resolveEventTranslation(event, language);
  const list = dtoEventN4DGetList(event, translation, isPrivileged);
  if (!list) {
    return null;
  }

  return {
    ...list,
    time: translation?.timeStr,
    locationLink: event.locationLink,
    followUpText: translation?.followupText,
    followUpLink: event.followupLink,
    outro: translation?.outro,
  };
}
