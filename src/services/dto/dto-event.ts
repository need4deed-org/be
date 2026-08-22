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

export function dtoEventN4DGetList(
  event: EventN4D,
  language: Lang,
): ApiEventN4DGetList | null {
  const translation = resolveTranslation(event, language);
  if (!translation) {
    return null;
  }

  return {
    id: event.id,
    active: event.isActive,
    // title/menuTitle are nullable in EventTranslation but required on the
    // API shape — a translation row without them is incomplete content, not
    // a reason to 500 the whole public feed.
    title: translation.title ?? "",
    subTitle: translation.subtitle,
    menuTitle: translation.menuTitle ?? "",
    date: event.date,
    dateEnd: event.dateEnd,
    type: event.type,
    pic: event.pic,
    address: event.address,
    locationComment: translation.locationComment,
    description: translation.description,
    shortDescription: translation.shortDescription,
    linkRSVP: event.rsvpLink,
    additionalTitle: translation.additionalTitle,
    additionalInfo: translation.additionalInfo,
  };
}
