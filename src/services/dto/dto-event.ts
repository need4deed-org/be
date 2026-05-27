import { ApiEventN4DGet, Lang } from "need4deed-sdk";
import EventN4D from "../../data/entity/event/event.entity";

export function dtoEvent(event: EventN4D, isoCode: Lang): ApiEventN4DGet {
  const eventTranslation = event.eventTranslation?.find(
    (et) => et.language.isoCode === isoCode,
  );
  return {
    id: event.id,
    active: event.isActive,
    title: eventTranslation?.title || "",
    subTitle: eventTranslation?.subtitle,
    menuTitle: eventTranslation?.menuTitle || "",
    hostName: event.hostName,
    date: event.date,
    dateEnd: event.dateEnd,
    type: event.type,
    pic: event.pic,
    time: eventTranslation?.timeStr || "",
    address: event.address,
    locationLink: event.locationLink,
    locationComment: eventTranslation?.locationComment,
    description: eventTranslation?.description || "",
    shortDescription: eventTranslation?.shortDescription || "",
    linkRSVP: event.rsvpLink,
    followUpText: eventTranslation?.followupText,
    followUpLink: event.followupLink,
    additionalTitle: eventTranslation?.additionalTitle,
    additionalInfo: eventTranslation?.additionalInfo,
    outro: eventTranslation?.outro,
  };
}
