import { ApiEventN4DCreate } from "need4deed-sdk";
import { dataSource } from "../../../data/data-source";
import EventTranslation from "../../../data/entity/event/event_translation.entity";
import EventN4D from "../../../data/entity/event/event.entity";
import Language from "../../../data/entity/profile/language.entity";
import { getRepository } from "../../../data/utils";

// POST /event (be#904): one EventN4D row (structural fields) + one
// EventTranslation row per submitted language, in a transaction.
export async function createEvent(input: ApiEventN4DCreate): Promise<EventN4D> {
  return dataSource.manager.transaction(async (manager) => {
    const languageRepository = getRepository(manager, Language);
    const eventRepository = getRepository(manager, EventN4D);
    const translationRepository = getRepository(manager, EventTranslation);

    async function getLanguageId(isoCode: string): Promise<number> {
      const language = await languageRepository.findOneOrFail({
        where: { isoCode },
      });
      return language.id;
    }

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
        languageId: await getLanguageId(input.translations[0].language),
      }),
    );

    await translationRepository.save(
      await Promise.all(
        input.translations.map(async (t) => {
          return new EventTranslation({
            eventn4dId: event.id,
            languageId: await getLanguageId(t.language),
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
          });
        }),
      ),
    );

    return event;
  });
}
