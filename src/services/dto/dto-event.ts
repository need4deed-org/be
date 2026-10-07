import { ApiEventN4DGet, ApiEventN4DGetList, Lang } from "need4deed-sdk";
import EventN4D from "../../data/entity/event/event.entity";

function resolveTranslation(event: EventN4D, language: Lang) {
  return (
    event.eventTranslation?.find((t) => t.language?.isoCode === language) ??
    event.eventTranslation?.[0]
  );
}

function sanitizeAdditionalInfo(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  return value.every((item) => typeof item === "string") ? value : undefined;
}

export function dtoEventN4DGetList(
  event: EventN4D,
  language: Lang,
  isPrivileged: boolean,
): ApiEventN4DGetList | null {
  const translation = resolveTranslation(event, language);
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
    additionalTitle: translation?.additionalTitle,
    additionalInfo: sanitizeAdditionalInfo(translation?.additionalInfo),
  };
}

export function dtoEventN4DGet(
  event: EventN4D,
  language: Lang,
  isPrivileged: boolean,
): ApiEventN4DGet | null {
  const list = dtoEventN4DGetList(event, language, isPrivileged);
  if (!list) {
    return null;
  }
  const translation = resolveTranslation(event, language);

  return {
    ...list,
    hostName: event.hostName,
    time: translation?.timeStr,
    locationLink: event.locationLink,
    followUpText: translation?.followupText,
    followUpLink: event.followupLink,
    outro: translation?.outro,
  };
}
