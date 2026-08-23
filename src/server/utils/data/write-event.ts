import { ApiEventN4DCreate } from "need4deed-sdk";
import { BadRequestError } from "../../../config";
import { dataSource } from "../../../data/data-source";
import EventTranslation from "../../../data/entity/event/event_translation.entity";
import EventN4D from "../../../data/entity/event/event.entity";
import { getRepository } from "../../../data/utils";
import { getLanguageIdByIsoCode } from "./get-language-title";

// POST /event (be#904): one EventN4D row (structural fields) + one
// EventTranslation row per submitted language, in a transaction.
export async function createEvent(input: ApiEventN4DCreate): Promise<EventN4D> {
  const languages = input.translations.map((t) => t.language);
  if (new Set(languages).size !== languages.length) {
    throw new BadRequestError(
      "Each translation must use a different language.",
    );
  }
  if (input.dateEnd && new Date(input.dateEnd) <= new Date(input.date)) {
    throw new BadRequestError("dateEnd must be after date.");
  }

  // Resolve each distinct language once — the event's own languageId reuses
  // whichever id the first translation resolves to, rather than looking it
  // up a second time.
  const languageIds = new Map<string, number>();
  for (const isoCode of new Set(languages)) {
    languageIds.set(isoCode, await getLanguageIdByIsoCode(isoCode));
  }

  return dataSource.manager.transaction(async (manager) => {
    const eventRepository = getRepository(manager, EventN4D);
    const translationRepository = getRepository(manager, EventTranslation);

    const event = await eventRepository.save(
      new EventN4D({
        // Matches the entity's own column default (false) — a created event
        // starts as a draft unless the coordinator explicitly publishes it.
        isActive: input.active ?? false,
        date: new Date(input.date),
        dateEnd: input.dateEnd ? new Date(input.dateEnd) : undefined,
        type: input.type,
        pic: input.pic,
        locationLink: input.locationLink,
        rsvpLink: input.linkRSVP,
        followupLink: input.followUpLink,
        address: input.address,
        hostName: input.hostName,
        // The language it was originally authored in — the first submitted
        // translation, by convention.
        languageId: languageIds.get(input.translations[0].language),
      }),
    );

    await translationRepository.save(
      input.translations.map(
        (t) =>
          new EventTranslation({
            eventn4dId: event.id,
            languageId: languageIds.get(t.language),
            title: t.title,
            subtitle: t.subTitle,
            menuTitle: t.menuTitle,
            timeStr: t.time,
            locationComment: t.locationComment,
            description: t.description,
            shortDescription: t.shortDescription,
            additionalTitle: t.additionalTitle,
            additionalInfo: t.additionalInfo,
            outro: t.outro,
            followupText: t.followUpText,
          }),
      ),
    );

    return event;
  });
}
