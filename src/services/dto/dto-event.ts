import { ApiEventN4DGetList, Lang } from "need4deed-sdk";
import EventN4D from "../../data/entity/event/event.entity";

// Resolves the translation matching the requested language; falls back to
// whatever translation exists rather than dropping the event from the feed
// just because it hasn't been authored in that language yet (be#903).
function resolveTranslation(event: EventN4D, language: Lang) {
  return (
    event.eventTranslation?.find((t) => t.language?.isoCode === language) ??
    event.eventTranslation?.[0]
  );
}

// additionalInfo is an untyped jsonb column — guard against anything other
// than an array of strings reaching the response schema (which requires
// exactly that shape) and 500ing the whole public list over one bad row.
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
  // A coordinator/admin still needs to see (and translate) an event with no
  // translation yet — that's exactly the "manage drafts" case this route
  // promises them. Only drop it for everyone else, since untranslated
  // content has nothing meaningful to show on the public site.
  if (!translation && !isPrivileged) {
    return null;
  }

  return {
    id: event.id,
    active: event.isActive,
    // title/menuTitle are nullable in EventTranslation but required on the
    // API shape — a translation row without them (or no translation row at
    // all) is incomplete content, not a reason to 500 the whole feed.
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
